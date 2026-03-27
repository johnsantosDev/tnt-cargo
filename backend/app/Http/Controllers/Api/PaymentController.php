<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Shipment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Payment::with(['client', 'shipment', 'receiver']);

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('shipment_id')) {
            $query->where('shipment_id', $request->shipment_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('method')) {
            $query->where('method', $request->method);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('payment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('payment_date', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        return response()->json(
            $query->orderBy('payment_date', 'desc')->paginate($request->get('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipment_id' => 'nullable|exists:shipments,id',
            'client_id' => 'required|exists:clients,id',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'method' => 'required|in:cash,bank_transfer,mobile_money,check,other',
            'type' => 'required|in:income,expense,refund',
            'status' => 'nullable|in:pending,completed,cancelled,refunded',
            'notes' => 'nullable|string',
            'payment_date' => 'required|date',
        ]);

        $validated['reference'] = Payment::generateReference();
        $validated['received_by'] = $request->user()->id;
        $validated['created_by'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'completed';

        $payment = Payment::create($validated);

        if ($validated['shipment_id'] && $validated['type'] === 'income' && $payment->status === 'completed') {
            $shipment = Shipment::find($validated['shipment_id']);
            if ($shipment) {
                $shipment->increment('amount_paid', $validated['amount']);
                $shipment->balance_due = $shipment->total_cost - $shipment->amount_paid;
                $shipment->save();
            }
        }

        if ($validated['type'] === 'income' && $payment->status === 'completed') {
            $payment->client->increment('total_spent', $validated['amount']);
            $this->recalculateClientDebt($validated['client_id']);
        }

        AuditService::log('created', $payment, null, $payment->toArray());

        return response()->json([
            'message' => 'Paiement enregistré avec succès.',
            'payment' => $payment->load(['client', 'shipment']),
        ], 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return response()->json($payment->load(['client', 'shipment', 'receiver', 'creator']));
    }

    public function update(Request $request, Payment $payment): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0.01',
            'method' => 'sometimes|in:cash,bank_transfer,mobile_money,check,other',
            'status' => 'sometimes|in:pending,completed,cancelled,refunded',
            'notes' => 'nullable|string',
            'payment_date' => 'sometimes|date',
        ]);

        $oldValues = $payment->toArray();
        $payment->update($validated);
        AuditService::log('updated', $payment, $oldValues, $payment->toArray());

        return response()->json([
            'message' => 'Paiement mis à jour.',
            'payment' => $payment->load(['client', 'shipment']),
        ]);
    }

    public function destroy(Payment $payment): JsonResponse
    {
        AuditService::log('deleted', $payment, $payment->toArray(), null);
        $payment->delete();

        return response()->json(['message' => 'Paiement supprimé.']);
    }

    private function recalculateClientDebt(int $clientId): void
    {
        $totalShipmentDebt = Shipment::where('client_id', $clientId)
            ->where('balance_due', '>', 0)
            ->sum('balance_due');

        $totalAdvanceDebt = \App\Models\CashAdvance::where('client_id', $clientId)
            ->whereIn('status', ['active', 'overdue'])
            ->sum('balance');

        \App\Models\Client::where('id', $clientId)
            ->update(['total_debt' => $totalShipmentDebt + $totalAdvanceDebt]);
    }
}
