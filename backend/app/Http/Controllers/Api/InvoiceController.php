<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Shipment;
use App\Services\AuditService;
use App\Support\RegionContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['client', 'shipment']);
        RegionContext::apply($query, $request);

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('date_from')) {
            $query->whereDate('issue_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('issue_date', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('issue_date', 'desc')->paginate($request->get('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'shipment_id' => 'nullable|exists:shipments,id',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'magerwa_price' => 'nullable|numeric|min:0',
            'auxiliary_fees' => 'nullable|array',
            'auxiliary_fees.*.label' => 'required|string|max:255',
            'auxiliary_fees.*.amount' => 'required|numeric|min:0',
            'cash_advance_id' => 'nullable|exists:cash_advances,id',
            'cash_advance_amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'due_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $tax = $validated['tax_amount'] ?? 0;
        $discount = $validated['discount_amount'] ?? 0;
        $magerwa = $validated['magerwa_price'] ?? 0;
        $auxiliaryFees = $validated['auxiliary_fees'] ?? null;

        $cashAdvanceAmount = $validated['cash_advance_amount'] ?? 0;
        if (!empty($validated['cash_advance_id'])) {
            $ca = CashAdvance::find($validated['cash_advance_id']);
            if ($ca && (float) $cashAdvanceAmount <= 0) {
                $cashAdvanceAmount = (float) ($ca->balance > 0 ? $ca->balance : $ca->amount);
            }
        }

        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $validated['client_id'],
            'shipment_id' => $validated['shipment_id'] ?? null,
            'subtotal' => 0,
            'tax_amount' => $tax,
            'discount_amount' => $discount,
            'magerwa_price' => $magerwa,
            'auxiliary_fees' => $auxiliaryFees,
            'cash_advance_id' => $validated['cash_advance_id'] ?? null,
            'cash_advance_amount' => $cashAdvanceAmount,
            'total' => 0,
            'currency' => $validated['currency'] ?? 'USD',
            'status' => 'draft',
            'issue_date' => now(),
            'due_date' => $validated['due_date'],
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()->id,
            'region' => RegionContext::resolveWriteRegion($request),
        ]);

        foreach ($validated['items'] as $item) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $item['quantity'] * $item['unit_price'],
            ]);
        }

        $invoice->recalculateTotal();
        $invoice->save();

        AuditService::log('created', $invoice, null, $invoice->toArray());

        return response()->json([
            'message' => 'Facture créée avec succès.',
            'invoice' => $invoice->load(['client', 'items', 'cashAdvance']),
        ], 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json(
            $invoice->load(['client', 'shipment', 'items', 'creator', 'cashAdvance'])
        );
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:draft,sent,paid,partial,overdue,cancelled',
            'tax_amount' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'magerwa_price' => 'sometimes|numeric|min:0',
            'auxiliary_fees' => 'nullable|array',
            'auxiliary_fees.*.label' => 'required_with:auxiliary_fees|string|max:255',
            'auxiliary_fees.*.amount' => 'required_with:auxiliary_fees|numeric|min:0',
            'cash_advance_id' => 'nullable|exists:cash_advances,id',
            'cash_advance_amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|date',
            'notes' => 'nullable|string',
            'amount_paid' => 'sometimes|numeric|min:0',
            'payment_amount' => 'nullable|numeric|min:0.01',
            'payment_method' => 'nullable|in:cash,bank_transfer,mobile_money,check,other',
            'payment_date' => 'nullable|date',
            'payment_bank_reference' => 'nullable|string|max:255',
            'payment_notes' => 'nullable|string',
        ]);

        $statusChangingToPaid = isset($validated['status'])
            && $validated['status'] === 'paid'
            && $invoice->status !== 'paid';

        if ($statusChangingToPaid && empty($validated['payment_amount'])) {
            return response()->json([
                'message' => 'Pour marquer cette facture comme payée, vous devez fournir les détails du paiement (montant, mode, date).',
                'errors' => [
                    'payment_amount' => ['Le montant du paiement est requis.'],
                    'payment_method' => ['Le mode de paiement est requis.'],
                    'payment_date' => ['La date du paiement est requise.'],
                ],
            ], 422);
        }

        $oldValues = $invoice->toArray();

        $payload = collect($validated)->except([
            'status', 'amount_paid', 'payment_amount', 'payment_method',
            'payment_date', 'payment_bank_reference', 'payment_notes',
        ])->toArray();

        // Allow status changes that aren't draft->paid (which goes through the payment flow)
        if (isset($validated['status']) && !$statusChangingToPaid) {
            $payload['status'] = $validated['status'];
        }

        if (!empty($payload)) {
            $invoice->update($payload);
        }

        if (array_key_exists('magerwa_price', $validated) || array_key_exists('auxiliary_fees', $validated)
            || array_key_exists('cash_advance_amount', $validated) || array_key_exists('cash_advance_id', $validated)
            || array_key_exists('tax_amount', $validated) || array_key_exists('discount_amount', $validated)) {
            $invoice->recalculateTotal();
            $invoice->save();
        }

        if ($statusChangingToPaid) {
            $this->createPaymentForInvoice($request, $invoice, $validated);
        } elseif (isset($validated['amount_paid'])) {
            $invoice->update(['amount_paid' => $validated['amount_paid']]);
            if ($invoice->amount_paid >= $invoice->total && $invoice->total > 0) {
                $invoice->update(['status' => 'paid', 'paid_date' => now()]);
            } elseif ($invoice->amount_paid > 0) {
                $invoice->update(['status' => 'partial']);
            }
        }

        AuditService::log('updated', $invoice, $oldValues, $invoice->fresh()->toArray());

        return response()->json([
            'message' => 'Facture mise à jour.',
            'invoice' => $invoice->fresh()->load(['client', 'items', 'cashAdvance']),
        ]);
    }

    public function generateFromShipment(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'magerwa_price' => 'nullable|numeric|min:0',
            'auxiliary_fees' => 'nullable|array',
            'auxiliary_fees.*.label' => 'required_with:auxiliary_fees|string|max:255',
            'auxiliary_fees.*.amount' => 'required_with:auxiliary_fees|numeric|min:0',
            'cash_advance_id' => 'nullable|exists:cash_advances,id',
            'cash_advance_amount' => 'nullable|numeric|min:0',
            'mark_paid' => 'nullable|boolean',
            'payment_amount' => 'nullable|numeric|min:0.01',
            'payment_method' => 'nullable|in:cash,bank_transfer,mobile_money,check,other',
            'payment_date' => 'nullable|date',
            'payment_bank_reference' => 'nullable|string|max:255',
            'payment_notes' => 'nullable|string',
        ]);

        $items = [];

        $plCargo = (float) ($shipment->pl_cargo_subtotal ?? 0);
        $plFreight = (float) ($shipment->pl_freight_subtotal ?? 0);

        if ($plCargo > 0) {
            $items[] = ['description' => 'Marchandise (packing lists)', 'quantity' => 1, 'unit_price' => $plCargo];
        }
        if ($plFreight > 0) {
            $items[] = ['description' => 'Fret & frais packing lists', 'quantity' => 1, 'unit_price' => $plFreight];
        }

        if ($plCargo <= 0 && $plFreight <= 0) {
            if ($shipment->shipping_cost > 0) {
                $items[] = ['description' => 'Frais d\'expédition', 'quantity' => 1, 'unit_price' => $shipment->shipping_cost];
            }
        }

        if ($shipment->customs_fee > 0) {
            $items[] = ['description' => 'Frais de douane', 'quantity' => 1, 'unit_price' => $shipment->customs_fee];
        }
        if ($shipment->warehouse_fee > 0) {
            $items[] = ['description' => "Frais d'entrepôt ({$shipment->warehouse_days} jours)", 'quantity' => 1, 'unit_price' => $shipment->warehouse_fee];
        }
        if ($shipment->other_fees > 0) {
            $items[] = ['description' => 'Autres frais', 'quantity' => 1, 'unit_price' => $shipment->other_fees];
        }
        if ($shipment->insurance_amount > 0) {
            $items[] = ['description' => 'Assurance', 'quantity' => 1, 'unit_price' => $shipment->insurance_amount];
        }

        foreach ($shipment->calculation_lines ?? [] as $line) {
            $amt = (float) ($line['amount'] ?? 0);
            if ($amt != 0.0 && !empty($line['description'])) {
                $items[] = ['description' => $line['description'], 'quantity' => 1, 'unit_price' => $amt];
            }
        }

        if (count($items) === 0) {
            $items[] = [
                'description' => "Frais d'expédition",
                'quantity' => 1,
                'unit_price' => (float) ($shipment->total_cost ?? 0),
            ];
        }

        $magerwa = (float) ($validated['magerwa_price'] ?? 0);
        $auxiliaryFees = $validated['auxiliary_fees'] ?? null;

        $cashAdvanceAmount = (float) ($validated['cash_advance_amount'] ?? 0);
        if (!empty($validated['cash_advance_id'])) {
            $ca = CashAdvance::find($validated['cash_advance_id']);
            if ($ca && $cashAdvanceAmount <= 0) {
                $cashAdvanceAmount = (float) ($ca->balance > 0 ? $ca->balance : $ca->amount);
            }
        }

        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $shipment->client_id,
            'shipment_id' => $shipment->id,
            'subtotal' => 0,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'magerwa_price' => $magerwa,
            'auxiliary_fees' => $auxiliaryFees,
            'cash_advance_id' => $validated['cash_advance_id'] ?? null,
            'cash_advance_amount' => $cashAdvanceAmount,
            'total' => 0,
            'amount_paid' => $shipment->amount_paid,
            'currency' => $shipment->declared_currency ?? 'USD',
            'status' => 'draft',
            'issue_date' => now(),
            'due_date' => now()->addDays(30),
            'created_by' => $request->user()->id,
            'region' => $shipment->region,
        ]);

        foreach ($items as $item) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $item['quantity'] * $item['unit_price'],
            ]);
        }

        $invoice->recalculateTotal();
        $invoice->save();

        if ($invoice->total > 0 && $invoice->amount_paid >= $invoice->total) {
            $invoice->update(['status' => 'paid', 'paid_date' => now()]);
        } elseif ($invoice->amount_paid > 0) {
            $invoice->update(['status' => 'partial']);
        }

        if (!empty($validated['mark_paid']) && (float) ($validated['payment_amount'] ?? 0) > 0) {
            $this->createPaymentForInvoice($request, $invoice, $validated);
        }

        return response()->json([
            'message' => 'Facture générée depuis l\'expédition.',
            'invoice' => $invoice->fresh()->load(['client', 'items', 'cashAdvance']),
        ], 201);
    }

    public function pay(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,bank_transfer,mobile_money,check,other',
            'payment_date' => 'required|date',
            'payment_bank_reference' => 'nullable|string|max:255',
            'payment_notes' => 'nullable|string',
            'proof' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf',
        ]);

        $payment = $this->createPaymentForInvoice($request, $invoice, $validated);

        return response()->json([
            'message' => 'Paiement enregistré pour la facture.',
            'invoice' => $invoice->fresh()->load(['client', 'items', 'cashAdvance']),
            'payment' => $payment->load(['client', 'shipment']),
        ]);
    }

    private function createPaymentForInvoice(Request $request, Invoice $invoice, array $data): Payment
    {
        $amount = (float) ($data['payment_amount'] ?? 0);
        $proofPath = null;
        $proofType = null;
        if ($request->hasFile('proof')) {
            $file = $request->file('proof');
            $proofPath = $file->store('payment-proofs', 'public');
            $proofType = $file->getMimeType();
        }

        $payment = Payment::create([
            'reference' => Payment::generateReference(),
            'client_id' => $invoice->client_id,
            'shipment_id' => $invoice->shipment_id,
            'amount' => $amount,
            'currency' => $invoice->currency ?? 'USD',
            'method' => $data['payment_method'] ?? 'cash',
            'type' => 'income',
            'status' => 'completed',
            'notes' => $data['payment_notes'] ?? null,
            'payment_date' => $data['payment_date'] ?? now(),
            'bank_reference' => $data['payment_bank_reference'] ?? null,
            'proof_path' => $proofPath,
            'proof_type' => $proofType,
            'received_by' => $request->user()->id,
            'created_by' => $request->user()->id,
            'region' => RegionContext::resolveWriteRegion($request),
        ]);

        if ($invoice->shipment_id) {
            $shipment = Shipment::find($invoice->shipment_id);
            if ($shipment) {
                $shipment->increment('amount_paid', $amount);
                $shipment->balance_due = $shipment->total_cost - $shipment->amount_paid;
                $shipment->save();
            }
        }

        $invoice->increment('amount_paid', $amount);
        $invoice->refresh();
        if ($invoice->amount_paid >= $invoice->total && $invoice->total > 0) {
            $invoice->update(['status' => 'paid', 'paid_date' => now()]);
        } elseif ($invoice->amount_paid > 0) {
            $invoice->update(['status' => 'partial']);
        }

        if ($invoice->client) {
            $invoice->client->increment('total_spent', $amount);
            $totalShipmentDebt = Shipment::where('client_id', $invoice->client_id)
                ->where('balance_due', '>', 0)
                ->sum('balance_due');
            $totalAdvanceDebt = CashAdvance::where('client_id', $invoice->client_id)
                ->whereIn('status', ['active', 'overdue'])
                ->sum('balance');
            Client::where('id', $invoice->client_id)
                ->update(['total_debt' => $totalShipmentDebt + $totalAdvanceDebt]);
        }

        AuditService::log('payment_added', $invoice, null, $payment->toArray());

        return $payment;
    }

    public function downloadPdf(Request $request, Invoice $invoice)
    {
        try {
            // Always-required relations
            $invoice->load(['client', 'items', 'shipment.packingLists.items', 'creator']);

            // cashAdvance is from a newer migration; if it isn't deployed yet, $invoice doesn't
            // have a cash_advance_id column and eager-loading the relation throws. Best-effort load.
            try {
                $invoice->load('cashAdvance');
            } catch (\Throwable $e) {
                \Log::warning('Invoice PDF: cashAdvance relation skipped', ['invoice_id' => $invoice->id, 'error' => $e->getMessage()]);
                $invoice->setRelation('cashAdvance', null);
            }

            $printedBy = $request->user();
            $printedAt = now();

            $pdf = Pdf::loadView('invoices.pdf', compact('invoice', 'printedBy', 'printedAt'));
            $clientName = str_replace(' ', '_', $invoice->client->name ?? 'client');
            $timestamp = now()->format('dmYHis');
            return $pdf->download("facture-{$clientName}-{$invoice->invoice_number}-{$timestamp}.pdf");
        } catch (\Throwable $e) {
            \Log::error('Invoice PDF generation failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Impossible de générer le PDF de la facture: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, Invoice $invoice): JsonResponse
    {
        if (!$request->user()->can('delete_invoices')) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        AuditService::log('deleted', $invoice, $invoice->toArray(), null);
        $invoice->delete();

        return response()->json(['message' => 'Facture supprimée.']);
    }
}
