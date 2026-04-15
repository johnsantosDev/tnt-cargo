<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\RegionContext;
use App\Models\Expense;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::with(['approver', 'creator']);
        RegionContext::apply($query, $request);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('expense_date', 'desc')->paginate($request->get('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'description' => 'required|string|max:500',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'expense_date' => 'required|date',
            'notes' => 'nullable|string',
            'receipt' => 'nullable|file|max:5120|mimes:pdf,jpg,jpeg,png',
        ]);

        $validated['reference'] = Expense::generateReference();
        $validated['created_by'] = $request->user()->id;
        $validated['region'] = RegionContext::resolveWriteRegion($request);

        if ($request->hasFile('receipt')) {
            $validated['receipt_path'] = $request->file('receipt')->store('expense-receipts', 'local');
        }
        unset($validated['receipt']);

        $expense = Expense::create($validated);
        AuditService::log('created', $expense, null, $expense->toArray());

        return response()->json([
            'message' => 'Dépense enregistrée avec succès.',
            'expense' => $expense,
        ], 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        return response()->json($expense->load(['approver', 'creator']));
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'sometimes|string|max:100',
            'description' => 'sometimes|string|max:500',
            'amount' => 'sometimes|numeric|min:0.01',
            'expense_date' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $expense->toArray();
        $expense->update($validated);
        AuditService::log('updated', $expense, $oldValues, $expense->toArray());

        return response()->json([
            'message' => 'Dépense mise à jour.',
            'expense' => $expense,
        ]);
    }

    public function approve(Request $request, Expense $expense): JsonResponse
    {
        $expense->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
        ]);

        AuditService::log('approved', $expense, ['status' => 'pending'], ['status' => 'approved']);

        return response()->json([
            'message' => 'Dépense approuvée.',
            'expense' => $expense,
        ]);
    }

    public function reject(Request $request, Expense $expense): JsonResponse
    {
        $expense->update(['status' => 'rejected']);
        AuditService::log('rejected', $expense, ['status' => 'pending'], ['status' => 'rejected']);

        return response()->json([
            'message' => 'Dépense rejetée.',
            'expense' => $expense,
        ]);
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        if (!$request->user()->can('delete_expenses')) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        AuditService::log('deleted', $expense, $expense->toArray(), null);
        $expense->delete();

        return response()->json(['message' => 'Dépense supprimée.']);
    }
}
