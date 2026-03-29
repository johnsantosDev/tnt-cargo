<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PackingList;
use App\Models\PackingListItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackingListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PackingList::with(['client', 'shipment', 'creator'])
            ->withCount('items');

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
            'price_per_cbm' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.weight' => 'nullable|numeric|min:0',
            'items.*.length' => 'nullable|numeric|min:0',
            'items.*.width' => 'nullable|numeric|min:0',
            'items.*.height' => 'nullable|numeric|min:0',
            'items.*.cbm' => 'nullable|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
            'items.*.received_at' => 'nullable|date',
        ]);

        $packingList = PackingList::create([
            'reference' => PackingList::generateReference(),
            'client_id' => $validated['client_id'],
            'price_per_cbm' => $validated['price_per_cbm'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);

        if (!empty($validated['items'])) {
            foreach ($validated['items'] as $item) {
                $packingList->items()->create($item);
            }
            $packingList->recalculateTotals();
        }

        AuditService::log('created', $packingList, null, $packingList->toArray());

        return response()->json([
            'message' => 'Packing list créée avec succès.',
            'packing_list' => $packingList->load(['client', 'items']),
        ], 201);
    }

    public function show(PackingList $packingList): JsonResponse
    {
        return response()->json(
            $packingList->load(['client', 'shipment', 'items', 'creator'])
        );
    }

    public function update(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status !== 'draft') {
            return response()->json(['message' => 'Seules les listes brouillon peuvent être modifiées.'], 422);
        }

        $validated = $request->validate([
            'client_id' => 'sometimes|exists:clients,id',
            'price_per_cbm' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $packingList->toArray();
        $packingList->update($validated);

        if (isset($validated['price_per_cbm'])) {
            $packingList->recalculateTotals();
        }

        AuditService::log('updated', $packingList, $oldValues, $packingList->toArray());

        return response()->json([
            'message' => 'Packing list mise à jour.',
            'packing_list' => $packingList->load(['client', 'items']),
        ]);
    }

    public function destroy(PackingList $packingList): JsonResponse
    {
        AuditService::log('deleted', $packingList, $packingList->toArray(), null);
        $packingList->delete();

        return response()->json(['message' => 'Packing list supprimée.']);
    }

    // --- Item management ---

    public function addItem(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status !== 'draft') {
            return response()->json(['message' => 'Impossible d\'ajouter des articles à une liste finalisée.'], 422);
        }

        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'weight' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',
            'cbm' => 'nullable|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'received_at' => 'nullable|date',
        ]);

        $item = $packingList->items()->create($validated);
        $packingList->recalculateTotals();

        return response()->json([
            'message' => 'Article ajouté.',
            'item' => $item,
            'packing_list' => $packingList->fresh()->load(['client', 'items']),
        ], 201);
    }

    public function updateItem(Request $request, PackingList $packingList, PackingListItem $item): JsonResponse
    {
        if ($item->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Article non trouvé dans cette packing list.'], 404);
        }
        if ($packingList->status !== 'draft') {
            return response()->json(['message' => 'Impossible de modifier des articles d\'une liste finalisée.'], 422);
        }

        $validated = $request->validate([
            'description' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|integer|min:1',
            'weight' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',
            'cbm' => 'nullable|numeric|min:0',
            'unit_price' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
            'received_at' => 'nullable|date',
        ]);

        $item->update($validated);
        $packingList->recalculateTotals();

        return response()->json([
            'message' => 'Article mis à jour.',
            'item' => $item->fresh(),
            'packing_list' => $packingList->fresh()->load(['client', 'items']),
        ]);
    }

    public function removeItem(PackingList $packingList, PackingListItem $item): JsonResponse
    {
        if ($item->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Article non trouvé dans cette packing list.'], 404);
        }
        if ($packingList->status !== 'draft') {
            return response()->json(['message' => 'Impossible de supprimer des articles d\'une liste finalisée.'], 422);
        }

        $item->delete();
        $packingList->recalculateTotals();

        return response()->json([
            'message' => 'Article supprimé.',
            'packing_list' => $packingList->fresh()->load(['client', 'items']),
        ]);
    }

    // --- Finalize & Invoice ---

    public function finalize(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status !== 'draft') {
            return response()->json(['message' => 'Cette packing list est déjà finalisée.'], 422);
        }

        if ($packingList->items()->count() === 0) {
            return response()->json(['message' => 'La packing list doit contenir au moins un article.'], 422);
        }

        $validated = $request->validate([
            'price_per_cbm' => 'sometimes|numeric|min:0',
            'shipment_id' => 'nullable|exists:shipments,id',
        ]);

        if (isset($validated['price_per_cbm'])) {
            $packingList->price_per_cbm = $validated['price_per_cbm'];
        }

        $packingList->recalculateTotals();
        $packingList->update([
            'status' => 'finalized',
            'finalized_at' => now(),
            'shipment_id' => $validated['shipment_id'] ?? $packingList->shipment_id,
        ]);

        AuditService::log('updated', $packingList, ['status' => 'draft'], ['status' => 'finalized']);

        return response()->json([
            'message' => 'Packing list finalisée.',
            'packing_list' => $packingList->load(['client', 'shipment', 'items']),
        ]);
    }

    public function generateInvoice(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status === 'draft') {
            return response()->json(['message' => 'Finalisez la packing list avant de générer une facture.'], 422);
        }

        $packingList->load('items');

        $subtotal = $packingList->items->sum('total_price');
        $shippingCost = $packingList->shipping_cost;
        $total = $subtotal + $shippingCost;

        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $packingList->client_id,
            'shipment_id' => $packingList->shipment_id,
            'subtotal' => $total,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total' => $total,
            'currency' => 'USD',
            'status' => 'draft',
            'issue_date' => now(),
            'due_date' => now()->addDays(30),
            'notes' => "Facture générée depuis la packing list {$packingList->reference}",
            'created_by' => $request->user()->id,
        ]);

        // Add each packing item as an invoice line
        foreach ($packingList->items as $item) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => "{$item->description} (CBM: {$item->cbm})",
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->total_price,
            ]);
        }

        // Add shipping cost as a separate line
        if ($shippingCost > 0) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => "Frais d'expédition ({$packingList->total_cbm} CBM × {$packingList->price_per_cbm}/CBM)",
                'quantity' => 1,
                'unit_price' => $shippingCost,
                'total' => $shippingCost,
            ]);
        }

        return response()->json([
            'message' => 'Facture générée depuis la packing list.',
            'invoice' => $invoice->load(['client', 'items']),
        ], 201);
    }

    public function getByShipment($shipmentId): JsonResponse
    {
        $packingLists = PackingList::with(['items', 'client'])
            ->where('shipment_id', $shipmentId)
            ->get();

        return response()->json($packingLists);
    }
}
