<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\CashAdvancePayment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashAdvanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CashAdvance::with(['client', 'creator']);

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('supplier_reference', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'supplier_reference' => 'required|string|max:255',
            'supplier_details' => 'nullable|string',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after:issue_date',
            'notes' => 'nullable|string',
        ]);

        $validated['reference'] = CashAdvance::generateReference();
        $validated['created_by'] = $request->user()->id;

        $advance = new CashAdvance($validated);
        $advance->calculateTotalDue();
        $advance->save();

        AuditService::log('created', $advance, null, $advance->toArray());

        return response()->json([
            'message' => 'Avance de trésorerie créée avec succès.',
            'cash_advance' => $advance->load('client'),
        ], 201);
    }

    public function show(CashAdvance $cashAdvance): JsonResponse
    {
        return response()->json(
            $cashAdvance->load(['client', 'advancePayments', 'creator'])
        );
    }

    public function update(Request $request, CashAdvance $cashAdvance): JsonResponse
    {
        $validated = $request->validate([
            'interest_rate' => 'sometimes|numeric|min:0|max:100',
            'commission_rate' => 'sometimes|numeric|min:0|max:100',
            'supplier_reference' => 'sometimes|string|max:255',
            'supplier_details' => 'nullable|string',
            'due_date' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $cashAdvance->toArray();
        $cashAdvance->update($validated);

        if (isset($validated['interest_rate']) || isset($validated['commission_rate'])) {
            $cashAdvance->calculateTotalDue();
            $cashAdvance->save();
        }

        AuditService::log('updated', $cashAdvance, $oldValues, $cashAdvance->toArray());

        return response()->json([
            'message' => 'Avance mise à jour.',
            'cash_advance' => $cashAdvance->load('client'),
        ]);
    }

    public function addPayment(Request $request, CashAdvance $cashAdvance): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'method' => 'required|in:cash,bank_transfer,mobile_money,check,other',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string',
            'evidence' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf',
        ]);

        if ($request->hasFile('evidence')) {
            $file = $request->file('evidence');
            $validated['evidence_path'] = $file->store('advance-evidence', 'public');
            $validated['evidence_type'] = $file->getMimeType();
            unset($validated['evidence']);
        }

        $validated['cash_advance_id'] = $cashAdvance->id;
        $validated['received_by'] = $request->user()->id;

        $payment = CashAdvancePayment::create($validated);

        $cashAdvance->increment('total_paid', $validated['amount']);
        $cashAdvance->balance = $cashAdvance->total_due - $cashAdvance->total_paid;

        if ($cashAdvance->balance <= 0) {
            $cashAdvance->status = 'paid';
            $cashAdvance->balance = 0;
        }

        $cashAdvance->save();

        AuditService::log('payment_added', $cashAdvance, null, $payment->toArray());

        return response()->json([
            'message' => 'Paiement enregistré.',
            'cash_advance' => $cashAdvance->load(['client', 'advancePayments']),
        ]);
    }

    public function destroy(Request $request, CashAdvance $cashAdvance): JsonResponse
    {
        if (!$request->user()->can('delete_cash_advances')) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        AuditService::log('deleted', $cashAdvance, $cashAdvance->toArray(), null);
        $cashAdvance->delete();

        return response()->json(['message' => 'Avance supprimée.']);
    }

    public function downloadEvidence(CashAdvancePayment $payment)
    {
        if (!$payment->evidence_path) {
            return response()->json(['message' => 'Aucune preuve disponible.'], 404);
        }

        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        if (!$disk->exists($payment->evidence_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return $disk->download($payment->evidence_path, 'preuve-avance.' . pathinfo($payment->evidence_path, PATHINFO_EXTENSION), [
            'Content-Type' => $payment->evidence_type ?? 'application/octet-stream',
        ]);
    }
}
