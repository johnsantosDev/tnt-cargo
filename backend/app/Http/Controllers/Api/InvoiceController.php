<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
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
            'currency' => 'nullable|string|size:3',
            'due_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $subtotal = 0;
        foreach ($validated['items'] as $item) {
            $subtotal += $item['quantity'] * $item['unit_price'];
        }

        $tax = $validated['tax_amount'] ?? 0;
        $discount = $validated['discount_amount'] ?? 0;
        $total = $subtotal + $tax - $discount;

        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $validated['client_id'],
            'shipment_id' => $validated['shipment_id'] ?? null,
            'subtotal' => $subtotal,
            'tax_amount' => $tax,
            'discount_amount' => $discount,
            'total' => $total,
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

        AuditService::log('created', $invoice, null, $invoice->toArray());

        return response()->json([
            'message' => 'Facture créée avec succès.',
            'invoice' => $invoice->load(['client', 'items']),
        ], 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json(
            $invoice->load(['client', 'shipment', 'items', 'creator'])
        );
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:draft,sent,paid,partial,overdue,cancelled',
            'tax_amount' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|date',
            'notes' => 'nullable|string',
            'amount_paid' => 'sometimes|numeric|min:0',
        ]);

        $oldValues = $invoice->toArray();
        $invoice->update($validated);

        if (isset($validated['amount_paid'])) {
            if ($invoice->amount_paid >= $invoice->total) {
                $invoice->update(['status' => 'paid', 'paid_date' => now()]);
            } elseif ($invoice->amount_paid > 0) {
                $invoice->update(['status' => 'partial']);
            }
        }

        AuditService::log('updated', $invoice, $oldValues, $invoice->toArray());

        return response()->json([
            'message' => 'Facture mise à jour.',
            'invoice' => $invoice->load(['client', 'items']),
        ]);
    }

    public function generateFromShipment(Request $request, Shipment $shipment): JsonResponse
    {
        $items = [];
        if ($shipment->shipping_cost > 0) {
            $items[] = ['description' => 'Frais d\'expédition', 'quantity' => 1, 'unit_price' => $shipment->shipping_cost];
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

        $subtotal = array_sum(array_column($items, 'unit_price'));

        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $shipment->client_id,
            'shipment_id' => $shipment->id,
            'subtotal' => $subtotal,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total' => $subtotal,
            'amount_paid' => $shipment->amount_paid,
            'currency' => $shipment->declared_currency,
            'status' => $shipment->amount_paid >= $subtotal ? 'paid' : ($shipment->amount_paid > 0 ? 'partial' : 'draft'),
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

        return response()->json([
            'message' => 'Facture générée depuis l\'expédition.',
            'invoice' => $invoice->load(['client', 'items']),
        ], 201);
    }

    public function downloadPdf(Invoice $invoice)
    {
        $invoice->load(['client', 'items', 'shipment']);
        $pdf = Pdf::loadView('invoices.pdf', compact('invoice'));
        $clientName = str_replace(' ', '_', $invoice->client->name ?? 'client');
        $timestamp = now()->format('dmYHis');
        return $pdf->download("facture-{$clientName}-{$invoice->invoice_number}-{$timestamp}.pdf");
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
