<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PackingList;
use App\Models\PackingListItem;
use App\Models\PackingListPhoto;
use App\Models\Shipment;
use App\Models\ShipmentHistory;
use App\Models\ShipmentStatus;
use App\Services\AuditService;
use App\Support\RegionContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PackingListController extends Controller
{
    protected function syncShipment(?int $shipmentId): void
    {
        if ($shipmentId) {
            Shipment::find($shipmentId)?->syncTotalsFromPackingLists();
        }
    }

    protected function canEditPackingListItems(Request $request, PackingList $packingList): bool
    {
        if ($packingList->status === 'draft') {
            return true;
        }

        return $request->user()->hasAnyRole(['admin', 'manager']) && $packingList->shipment_id !== null;
    }

    public function index(Request $request): JsonResponse
    {
        $query = PackingList::with(['client', 'shipment', 'creator', 'items'])
            ->withCount(['items', 'photos']);
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
            'shipment_id' => 'nullable|exists:shipments,id',
            'parcel_count' => 'nullable|integer|min:1',
            'gross_weight_kg' => 'nullable|numeric|min:0',
            'price_per_cbm' => 'nullable|numeric|min:0',
            'additional_fees' => 'nullable|numeric|min:0',
            'fees_description' => 'nullable|string|max:500',
            'notes' => 'nullable|string',
            'cbm_count' => 'nullable|numeric|min:0',
            'header_cbm' => 'nullable|numeric|min:0',
            'items' => 'nullable|array',
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

        $pricePerCbm = $validated['price_per_cbm'] ?? 0;
        $headerCbm = (float) ($validated['header_cbm'] ?? $validated['cbm_count'] ?? 0);

        $packingList = PackingList::create([
            'reference' => PackingList::generateReference(),
            'client_id' => $validated['client_id'],
            'shipment_id' => $validated['shipment_id'] ?? null,
            'parcel_count' => $validated['parcel_count'] ?? 1,
            'gross_weight_kg' => $validated['gross_weight_kg'] ?? null,
            'header_cbm' => $headerCbm,
            'price_per_cbm' => $pricePerCbm,
            'additional_fees' => $validated['additional_fees'] ?? 0,
            'fees_description' => $validated['fees_description'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'finalized',
            'created_by' => $request->user()->id,
            'region' => RegionContext::resolveWriteRegion($request),
        ]);

        if (!empty($validated['items'])) {
            foreach ($validated['items'] as $item) {
                $packingList->items()->create($item);
            }
        }
        $packingList->recalculateTotals();

        $this->syncShipment($packingList->shipment_id);

        AuditService::log('created', $packingList, null, $packingList->toArray());

        return response()->json([
            'message' => 'Packing list créée avec succès.',
            'packing_list' => $packingList->load(['client', 'items']),
        ], 201);
    }

    public function show(PackingList $packingList): JsonResponse
    {
        return response()->json(
            $packingList->load(['client', 'shipment', 'items', 'creator', 'photos'])
        );
    }

    public function update(Request $request, PackingList $packingList): JsonResponse
    {
        $canEditHeader = $packingList->status === 'draft'
            || ($request->user()->hasAnyRole(['admin', 'manager']) && $packingList->shipment_id);

        if (!$canEditHeader) {
            return response()->json(['message' => 'Seules les listes brouillon peuvent être modifiées.'], 422);
        }

        $validated = $request->validate([
            'client_id' => 'sometimes|exists:clients,id',
            'shipment_id' => 'nullable|exists:shipments,id',
            'parcel_count' => 'sometimes|integer|min:1',
            'gross_weight_kg' => 'nullable|numeric|min:0',
            'header_cbm' => 'sometimes|numeric|min:0',
            'price_per_cbm' => 'sometimes|numeric|min:0',
            'additional_fees' => 'sometimes|numeric|min:0',
            'fees_description' => 'nullable|string|max:500',
            'notes' => 'nullable|string',
        ]);

        $oldShipmentId = $packingList->shipment_id;
        $oldValues = $packingList->toArray();
        $packingList->update($validated);
        $packingList->recalculateTotals();

        $this->syncShipment($oldShipmentId);
        $this->syncShipment($packingList->shipment_id);

        AuditService::log('updated', $packingList, $oldValues, $packingList->toArray());

        return response()->json([
            'message' => 'Packing list mise à jour.',
            'packing_list' => $packingList->load(['client', 'items', 'photos', 'shipment']),
        ]);
    }

    public function destroy(Request $request, PackingList $packingList): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $shipmentId = $packingList->shipment_id;
        AuditService::log('deleted', $packingList, $packingList->toArray(), null);
        $packingList->delete();
        $this->syncShipment($shipmentId);

        return response()->json(['message' => 'Packing list supprimée.']);
    }

    // --- Item management ---

    public function addItem(Request $request, PackingList $packingList): JsonResponse
    {
        if (!$this->canEditPackingListItems($request, $packingList)) {
            return response()->json(['message' => 'Impossible d\'ajouter des articles à cette liste.'], 422);
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
        $this->syncShipment($packingList->shipment_id);

        return response()->json([
            'message' => 'Article ajouté.',
            'item' => $item,
            'packing_list' => $packingList->fresh()->load(['client', 'items', 'photos']),
        ], 201);
    }

    public function updateItem(Request $request, PackingList $packingList, PackingListItem $item): JsonResponse
    {
        if ($item->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Article non trouvé dans cette packing list.'], 404);
        }
        if (!$this->canEditPackingListItems($request, $packingList)) {
            return response()->json(['message' => 'Impossible de modifier des articles de cette liste.'], 422);
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
        $this->syncShipment($packingList->shipment_id);

        return response()->json([
            'message' => 'Article mis à jour.',
            'item' => $item->fresh(),
            'packing_list' => $packingList->fresh()->load(['client', 'items', 'photos']),
        ]);
    }

    public function removeItem(Request $request, PackingList $packingList, PackingListItem $item): JsonResponse
    {
        if ($item->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Article non trouvé dans cette packing list.'], 404);
        }
        if (!$this->canEditPackingListItems($request, $packingList)) {
            return response()->json(['message' => 'Impossible de supprimer des articles de cette liste.'], 422);
        }

        $item->delete();
        $packingList->recalculateTotals();
        $this->syncShipment($packingList->shipment_id);

        return response()->json([
            'message' => 'Article supprimé.',
            'packing_list' => $packingList->fresh()->load(['client', 'items', 'photos']),
        ]);
    }

    // --- Finalize & Invoice ---

    public function finalize(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status !== 'draft') {
            return response()->json(['message' => 'Cette packing list est déjà finalisée.'], 422);
        }

        $hasItems = $packingList->items()->count() > 0;
        $hasWeight = $packingList->gross_weight_kg !== null && (float) $packingList->gross_weight_kg > 0;
        $hasPhotos = $packingList->photos()->count() > 0;
        $hasDeclaredCbm = (float) ($packingList->header_cbm ?? 0) > 0;
        if (!$hasItems && !$hasWeight && !$hasPhotos && !$hasDeclaredCbm) {
            return response()->json(['message' => 'Ajoutez des articles, un poids déclaré, des CBM ou des photos avant de finaliser.'], 422);
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

        $this->syncShipment($packingList->shipment_id);

        AuditService::log('updated', $packingList, ['status' => 'draft'], ['status' => 'finalized']);

        return response()->json([
            'message' => 'Packing list finalisée.',
            'packing_list' => $packingList->load(['client', 'shipment', 'items', 'photos']),
        ]);
    }

    public function generateInvoice(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status === 'draft') {
            return response()->json(['message' => 'Finalisez la packing list avant de générer une facture.'], 422);
        }

        $packingList->load('items');

        $shippingCost = $packingList->shipping_cost;
        $additionalFees = $packingList->additional_fees ?? 0;

        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $packingList->client_id,
            'shipment_id' => $packingList->shipment_id,
            'subtotal' => 0,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'magerwa_price' => 0,
            'auxiliary_fees' => null,
            'cash_advance_id' => null,
            'cash_advance_amount' => 0,
            'total' => 0,
            'currency' => 'USD',
            'status' => 'draft',
            'issue_date' => now(),
            'due_date' => now()->addDays(30),
            'notes' => "Facture générée depuis la packing list {$packingList->reference}",
            'created_by' => $request->user()->id,
            'region' => $packingList->region,
        ]);

        // Add each packing item as an invoice line
        foreach ($packingList->items as $item) {
            $cbmPart = (float) ($item->cbm ?? 0) > 0 ? ' (CBM: '.$item->cbm.')' : '';
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $item->description.$cbmPart,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->total_price,
            ]);
        }

        // Add shipping cost as a separate line
        if ($shippingCost > 0) {
            $cbmLabel = (float) $packingList->total_cbm > 0
                ? "Frais d'expédition ({$packingList->total_cbm} CBM × {$packingList->price_per_cbm}/CBM)"
                : "Frais d'expédition";
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $cbmLabel,
                'quantity' => 1,
                'unit_price' => $shippingCost,
                'total' => $shippingCost,
            ]);
        }

        // Add additional fees as a separate line
        if ($additionalFees > 0) {
            $feesLabel = $packingList->fees_description
                ? "Frais supplémentaires: {$packingList->fees_description}"
                : 'Frais supplémentaires';
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'description' => $feesLabel,
                'quantity' => 1,
                'unit_price' => $additionalFees,
                'total' => $additionalFees,
            ]);
        }

        $invoice->recalculateTotal();
        $invoice->save();

        return response()->json([
            'message' => 'Facture générée depuis la packing list.',
            'invoice' => $invoice->load(['client', 'items', 'cashAdvance']),
        ], 201);
    }

    public function createShipment(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status === 'draft') {
            return response()->json(['message' => 'Finalisez la packing list avant de créer une expédition.'], 422);
        }

        if ($packingList->shipment_id) {
            return response()->json(['message' => 'Cette packing list est déjà liée à une expédition.'], 422);
        }

        $validated = $request->validate([
            'origin' => 'required|in:china,dubai,turkey,other',
            'destination' => 'nullable|string|max:255',
            'cargo_type' => 'required|in:sea,air',
            'container_code' => 'nullable|string|max:100',
            'flight_reference' => 'nullable|string|max:100',
            'estimated_arrival' => 'nullable|date',
            'special_instructions' => 'nullable|string',
        ]);

        $packingList->load('items');

        $itemDescriptions = $packingList->items->pluck('description')->implode(', ');
        $description = mb_substr($itemDescriptions, 0, 500);

        $defaultStatus = ShipmentStatus::where('is_default', true)->first();

        $shipment = Shipment::create([
            'tracking_number' => Shipment::generateTrackingNumber(),
            'client_id' => $packingList->client_id,
            'package_type' => $validated['cargo_type'],
            'container_code' => $validated['cargo_type'] === 'sea' ? ($validated['container_code'] ?? null) : ($validated['flight_reference'] ?? null),
            'origin' => $validated['origin'],
            'destination' => $validated['destination'] ?? 'Goma',
            'description' => $description,
            'weight' => $packingList->total_weight,
            'volume' => $packingList->total_cbm,
            'quantity' => $packingList->items->sum('quantity'),
            'shipping_cost' => $packingList->shipping_cost,
            'total_cost' => $packingList->total_amount + $packingList->shipping_cost,
            'balance_due' => $packingList->total_amount + $packingList->shipping_cost,
            'status_id' => $defaultStatus?->id ?? 1,
            'created_by' => $request->user()->id,
            'estimated_arrival' => $validated['estimated_arrival'] ?? null,
            'special_instructions' => $validated['special_instructions'] ?? null,
            'region' => $packingList->region,
        ]);

        ShipmentHistory::create([
            'shipment_id' => $shipment->id,
            'status_id' => $shipment->status_id,
            'changed_by' => $request->user()->id,
            'comment' => "Expédition créée depuis la packing list {$packingList->reference}",
        ]);

        $packingList->update(['shipment_id' => $shipment->id]);

        $shipment->client->increment('shipment_count');

        $shipment->syncTotalsFromPackingLists();

        AuditService::log('created', $shipment, null, $shipment->toArray());

        return response()->json([
            'message' => 'Expédition créée depuis la packing list.',
            'shipment' => $shipment->load(['client', 'status']),
        ], 201);
    }

    public function createShipmentFromItems(Request $request, PackingList $packingList): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'required|integer|exists:packing_list_items,id',
            'origin' => 'required|in:china,dubai,turkey,other',
            'destination' => 'nullable|string|max:255',
            'container_code' => 'nullable|string|max:100',
            'estimated_arrival' => 'nullable|date',
            'special_instructions' => 'nullable|string',
        ]);

        // Verify all items belong to this packing list
        $items = PackingListItem::whereIn('id', $validated['item_ids'])
            ->where('packing_list_id', $packingList->id)
            ->get();

        if ($items->count() !== count($validated['item_ids'])) {
            return response()->json(['message' => 'Certains articles ne font pas partie de cette packing list.'], 422);
        }

        $totalCbm = $items->sum(fn($i) => $i->cbm * $i->quantity);
        $totalWeight = $items->sum(fn($i) => ($i->weight ?? 0) * $i->quantity);
        $totalAmount = $items->sum('total_price');
        $totalQty = $items->sum('quantity');
        $shippingCost = $totalCbm * $packingList->price_per_cbm;

        $itemDescriptions = $items->pluck('description')->implode(', ');
        $description = mb_substr($itemDescriptions, 0, 500);

        $defaultStatus = ShipmentStatus::where('is_default', true)->first();

        $shipment = Shipment::create([
            'tracking_number' => Shipment::generateTrackingNumber(),
            'client_id' => $packingList->client_id,
            'container_code' => $validated['container_code'] ?? null,
            'origin' => $validated['origin'],
            'destination' => $validated['destination'] ?? 'Goma',
            'description' => $description,
            'weight' => $totalWeight,
            'volume' => $totalCbm,
            'quantity' => $totalQty,
            'shipping_cost' => $shippingCost,
            'total_cost' => $totalAmount + $shippingCost,
            'balance_due' => $totalAmount + $shippingCost,
            'status_id' => $defaultStatus?->id ?? 1,
            'created_by' => $request->user()->id,
            'estimated_arrival' => $validated['estimated_arrival'] ?? null,
            'special_instructions' => $validated['special_instructions'] ?? null,
            'region' => $packingList->region,
        ]);

        ShipmentHistory::create([
            'shipment_id' => $shipment->id,
            'status_id' => $shipment->status_id,
            'changed_by' => $request->user()->id,
            'comment' => "Expédition créée depuis la packing list {$packingList->reference} ({$items->count()} articles)",
        ]);

        $shipment->client->increment('shipment_count');

        // Remove shipped items from packing list
        PackingListItem::whereIn('id', $validated['item_ids'])->delete();

        // Recalculate packing list totals
        $packingList->recalculateTotals();

        AuditService::log('created', $shipment, null, $shipment->toArray());

        return response()->json([
            'message' => 'Expédition créée avec les articles sélectionnés.',
            'shipment' => $shipment->load(['client', 'status']),
            'packing_list' => $packingList->fresh()->load(['client', 'shipment', 'items']),
        ], 201);
    }

    public function createShipmentFromLists(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'packing_list_ids' => 'required|array|min:1',
            'packing_list_ids.*' => 'required|integer|exists:packing_lists,id',
            'origin' => 'required|in:china,dubai,turkey,other',
            'destination' => 'nullable|string|max:255',
            'cargo_type' => 'required|in:sea,air',
            'container_code' => 'nullable|string|max:100',
            'flight_reference' => 'nullable|string|max:100',
            'estimated_arrival' => 'nullable|date',
            'special_instructions' => 'nullable|string',
        ]);

        $packingLists = PackingList::with('items')
            ->whereIn('id', $validated['packing_list_ids'])
            ->get();

        if ($packingLists->count() !== count($validated['packing_list_ids'])) {
            return response()->json(['message' => 'Certaines listes de colisage sont introuvables.'], 422);
        }

        // Check all PLs belong to the same client
        $clientIds = $packingLists->pluck('client_id')->unique();
        if ($clientIds->count() > 1) {
            return response()->json(['message' => 'Toutes les listes de colisage doivent appartenir au même client.'], 422);
        }

        // Check none are already shipped
        $alreadyShipped = $packingLists->where('shipment_id', '!=', null);
        if ($alreadyShipped->isNotEmpty()) {
            return response()->json(['message' => 'Certaines listes sont déjà liées à une expédition: ' . $alreadyShipped->pluck('reference')->implode(', ')], 422);
        }

        $totalCbm = $packingLists->sum('total_cbm');
        $totalWeight = $packingLists->sum('total_weight');
        $totalAmount = $packingLists->sum('total_amount');
        $totalShippingCost = $packingLists->sum('shipping_cost');
        $totalAdditionalFees = $packingLists->sum('additional_fees');
        $totalQty = $packingLists->sum(fn($pl) => $pl->items->sum('quantity'));

        $allDescriptions = $packingLists->flatMap(fn($pl) => $pl->items->pluck('description'))->implode(', ');
        $description = mb_substr($allDescriptions, 0, 500);

        $grandTotal = $totalAmount + $totalShippingCost + $totalAdditionalFees;

        $defaultStatus = ShipmentStatus::where('is_default', true)->first();

        $shipment = Shipment::create([
            'tracking_number' => Shipment::generateTrackingNumber(),
            'client_id' => $clientIds->first(),
            'package_type' => $validated['cargo_type'],
            'container_code' => $validated['cargo_type'] === 'sea' ? ($validated['container_code'] ?? null) : ($validated['flight_reference'] ?? null),
            'origin' => $validated['origin'],
            'destination' => $validated['destination'] ?? 'Goma',
            'description' => $description,
            'weight' => $totalWeight,
            'volume' => $totalCbm,
            'quantity' => $totalQty,
            'shipping_cost' => $totalShippingCost,
            'total_cost' => $grandTotal,
            'balance_due' => $grandTotal,
            'status_id' => $defaultStatus?->id ?? 1,
            'created_by' => $request->user()->id,
            'estimated_arrival' => $validated['estimated_arrival'] ?? null,
            'special_instructions' => $validated['special_instructions'] ?? null,
            'region' => RegionContext::resolveWriteRegion($request),
        ]);

        $references = $packingLists->pluck('reference')->implode(', ');
        ShipmentHistory::create([
            'shipment_id' => $shipment->id,
            'status_id' => $shipment->status_id,
            'changed_by' => $request->user()->id,
            'comment' => "Expédition créée depuis les listes de colisage: {$references}",
        ]);

        // Link all packing lists to this shipment and mark as shipped
        foreach ($packingLists as $pl) {
            $pl->update([
                'shipment_id' => $shipment->id,
                'status' => 'shipped',
            ]);
        }

        $shipment->client->increment('shipment_count');

        $shipment->syncTotalsFromPackingLists();

        AuditService::log('created', $shipment, null, $shipment->toArray());

        return response()->json([
            'message' => 'Expédition créée avec ' . $packingLists->count() . ' liste(s) de colisage.',
            'shipment' => $shipment->load(['client', 'status']),
        ], 201);
    }

    public function getByShipment($shipmentId): JsonResponse
    {
        $packingLists = PackingList::with(['items', 'client', 'photos'])
            ->where('shipment_id', $shipmentId)
            ->get();

        return response()->json($packingLists);
    }

    public function uploadPhotos(Request $request, PackingList $packingList): JsonResponse
    {
        if ($packingList->status === 'shipped' && !$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $request->validate([
            'photos' => 'required|array|min:1|max:20',
            'photos.*' => 'required|image|max:5120',
        ]);

        $maxSort = (int) $packingList->photos()->max('sort_order');
        $created = [];
        foreach ($request->file('photos') as $i => $file) {
            $path = $file->store('packing-list-photos/'.$packingList->id, 'local');
            $created[] = $packingList->photos()->create([
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'sort_order' => $maxSort + $i + 1,
            ]);
        }

        return response()->json([
            'message' => count($created).' photo(s) ajoutée(s).',
            'photos' => $created,
        ], 201);
    }

    public function deletePhoto(Request $request, PackingList $packingList, PackingListPhoto $photo): JsonResponse
    {
        if ($photo->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Photo introuvable.'], 404);
        }
        if ($packingList->status === 'shipped' && !$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        Storage::disk('local')->delete($photo->file_path);
        $photo->delete();

        return response()->json(['message' => 'Photo supprimée.']);
    }

    public function downloadPhoto(PackingList $packingList, PackingListPhoto $photo)
    {
        if ($photo->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Photo introuvable.'], 404);
        }

        $path = Storage::disk('local')->path($photo->file_path);
        if (!is_readable($path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return response()->file($path);
    }

    public function downloadItemReceipt(PackingList $packingList, PackingListItem $item)
    {
        if ($item->packing_list_id !== $packingList->id) {
            return response()->json(['message' => 'Article non trouvé dans cette Packing List.'], 404);
        }

        $packingList->load('client');

        $pdf = Pdf::loadView('packing-lists.item-receipt', [
            'packingList' => $packingList,
            'item' => $item,
        ]);

        return $pdf->download("receipt-item-{$packingList->reference}-{$item->id}-" . now()->format('dmYHis') . ".pdf");
    }

    public function downloadReceipt(PackingList $packingList)
    {
        $packingList->load(['client', 'items', 'shipment']);

        $packingList->load('photos');

        $pdf = Pdf::loadView('packing-lists.receipt', [
            'packingList' => $packingList,
        ]);

        return $pdf->download("packing-list-{$packingList->reference}-" . now()->format('dmYHis') . ".pdf");
    }
}
