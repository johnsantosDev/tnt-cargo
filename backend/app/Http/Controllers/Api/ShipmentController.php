<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use App\Models\ShipmentHistory;
use App\Models\ShipmentStatus;
use App\Services\AuditService;
use App\Support\RegionContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShipmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Shipment::with(['client', 'status', 'assignedUser']);
        RegionContext::apply($query, $request);

        if ($request->filled('status')) {
            $query->whereHas('status', fn($q) => $q->where('slug', $request->status));
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('origin')) {
            $query->where('origin', $request->origin);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                  ->orWhere('container_code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $sortField = $request->get('sort', 'created_at');
        $sortDir = $request->get('direction', 'desc');
        $query->orderBy($sortField, $sortDir);

        $shipments = $query->paginate($request->get('per_page', 15));

        return response()->json($shipments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'container_code' => 'nullable|string|max:100',
            'origin' => 'required|in:china,dubai,turkey,other',
            'origin_detail' => 'nullable|string|max:255',
            'destination' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|integer|min:1',
            'package_type' => 'nullable|string|max:100',
            'declared_value' => 'nullable|numeric|min:0',
            'declared_currency' => 'nullable|string|size:3',
            'shipping_cost' => 'nullable|numeric|min:0',
            'customs_fee' => 'nullable|numeric|min:0',
            'other_fees' => 'nullable|numeric|min:0',
            'estimated_arrival' => 'nullable|date',
            'special_instructions' => 'nullable|string',
            'is_fragile' => 'nullable|boolean',
            'is_insured' => 'nullable|boolean',
            'insurance_amount' => 'nullable|numeric|min:0',
            'receiver_name' => 'nullable|string|max:255',
            'receiver_phone' => 'nullable|string|max:20',
            'delivery_address' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $validated['tracking_number'] = Shipment::generateTrackingNumber();
        $validated['status_id'] = ShipmentStatus::resolveInitialShipmentStatusId();
        $validated['created_by'] = $request->user()->id;
        $validated['destination'] = $validated['destination'] ?? 'Goma';
        $validated['region'] = RegionContext::resolveWriteRegion($request);

        $shipment = Shipment::create($validated);
        $shipment->calculateTotalCost();
        $shipment->save();

        ShipmentHistory::create([
            'shipment_id' => $shipment->id,
            'status_id' => $shipment->status_id,
            'changed_by' => $request->user()->id,
            'comment' => 'Expédition créée',
        ]);

        $shipment->client->increment('shipment_count');

        AuditService::log('created', $shipment, null, $shipment->toArray());

        return response()->json([
            'message' => 'Expédition créée avec succès.',
            'shipment' => $shipment->load(['client', 'status']),
        ], 201);
    }

    public function show(Shipment $shipment): JsonResponse
    {
        $shipment->load([
            'client', 'status', 'assignedUser', 'creator',
            'history.status', 'history.user',
            'documents', 'payments',
        ]);

        return response()->json($shipment);
    }

    public function update(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'sometimes|exists:clients,id',
            'container_code' => 'nullable|string|max:100',
            'origin' => 'sometimes|in:china,dubai,turkey,other',
            'origin_detail' => 'nullable|string|max:255',
            'destination' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|integer|min:1',
            'package_type' => 'nullable|string|max:100',
            'declared_value' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'customs_fee' => 'nullable|numeric|min:0',
            'other_fees' => 'nullable|numeric|min:0',
            'warehouse_daily_rate' => 'nullable|numeric|min:0',
            'estimated_arrival' => 'nullable|date',
            'actual_arrival' => 'nullable|date',
            'warehouse_entry_date' => 'nullable|date',
            'warehouse_exit_date' => 'nullable|date',
            'special_instructions' => 'nullable|string',
            'is_fragile' => 'nullable|boolean',
            'is_insured' => 'nullable|boolean',
            'insurance_amount' => 'nullable|numeric|min:0',
            'receiver_name' => 'nullable|string|max:255',
            'receiver_phone' => 'nullable|string|max:20',
            'delivery_address' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'calculation_lines' => 'nullable|array',
            'calculation_lines.*.description' => 'required_with:calculation_lines|string|max:255',
            'calculation_lines.*.amount' => 'required_with:calculation_lines|numeric',
        ]);

        $oldValues = $shipment->toArray();
        $shipment->update($validated);
        $shipment->calculateWarehouseFee();
        $shipment->calculateTotalCost();
        $shipment->save();

        AuditService::log('updated', $shipment, $oldValues, $shipment->toArray());

        return response()->json([
            'message' => 'Expédition mise à jour.',
            'shipment' => $shipment->load(['client', 'status']),
        ]);
    }

    public function updateStatus(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'status_id' => 'required|exists:shipment_statuses,id',
            'comment' => 'nullable|string',
            'location' => 'nullable|string|max:255',
        ]);

        $oldStatusId = $shipment->status_id;
        $shipment->update(['status_id' => $validated['status_id']]);

        ShipmentHistory::create([
            'shipment_id' => $shipment->id,
            'status_id' => $validated['status_id'],
            'changed_by' => $request->user()->id,
            'comment' => $validated['comment'] ?? null,
            'location' => $validated['location'] ?? null,
        ]);

        $newStatus = ShipmentStatus::find($validated['status_id']);
        if ($newStatus && $newStatus->slug === 'warehouse' && !$shipment->warehouse_entry_date) {
            $shipment->update(['warehouse_entry_date' => now()]);
        }
        if ($newStatus && in_array($newStatus->slug, ['in-transit', 'customs', 'arrived', 'delivered']) && $shipment->warehouse_entry_date && !$shipment->warehouse_exit_date) {
            $shipment->update(['warehouse_exit_date' => now()]);
            $shipment->calculateWarehouseFee();
            $shipment->calculateTotalCost();
            $shipment->save();
        }
        if ($newStatus && $newStatus->slug === 'arrived') {
            $shipment->update(['actual_arrival' => now()]);
        }

        AuditService::log('status_changed', $shipment, ['status_id' => $oldStatusId], ['status_id' => $validated['status_id']]);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'shipment' => $shipment->load(['client', 'status', 'history.status']),
        ]);
    }

    public function destroy(Request $request, Shipment $shipment): JsonResponse
    {
        if (!$request->user()->can('delete_shipments')) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        AuditService::log('deleted', $shipment, $shipment->toArray(), null);
        $shipment->delete();

        return response()->json(['message' => 'Expédition supprimée.']);
    }

    public function completeShipment(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'completion_note' => 'nullable|string',
        ]);

        $deliveredStatus = ShipmentStatus::where('slug', 'delivered')->first();
        if ($deliveredStatus) {
            $shipment->status_id = $deliveredStatus->id;
        }

        $shipment->update([
            'status_id' => $shipment->status_id,
            'completed_at' => now(),
            'completed_by' => $request->user()->id,
            'completion_note' => $validated['completion_note'] ?? null,
        ]);

        ShipmentHistory::create([
            'shipment_id' => $shipment->id,
            'status_id' => $shipment->status_id,
            'changed_by' => $request->user()->id,
            'comment' => 'Expédition complétée — Colis retiré par le client',
        ]);

        AuditService::log('completed', $shipment, ['completed_at' => null], ['completed_at' => now()->toDateTimeString()]);

        return response()->json([
            'message' => 'Expédition complétée avec succès.',
            'shipment' => $shipment->load(['client', 'status']),
        ]);
    }

    public function downloadCompletionPdf(Shipment $shipment)
    {
        $shipment->load(['client', 'status', 'history.status', 'creator', 'payments']);

        $packingItems = \App\Models\PackingListItem::whereHas('packingList', function ($q) use ($shipment) {
            $q->where('shipment_id', $shipment->id);
        })->with('packingList')->get();

        $pdf = Pdf::loadView('shipments.completion', compact('shipment', 'packingItems'));
        $clientName = str_replace(' ', '_', $shipment->client->name ?? 'client');
        $timestamp = now()->format('dmYHis');
        return $pdf->download("completion-{$clientName}-{$shipment->tracking_number}-{$timestamp}.pdf");
    }

    public function uploadDocuments(Request $request, Shipment $shipment): JsonResponse
    {
        $request->validate([
            'documents' => 'required|array|min:1',
            'documents.*' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx',
            'name' => 'nullable|string|max:255',
        ]);

        $docs = [];
        foreach ($request->file('documents') as $file) {
            $path = $file->store('shipment-documents/' . $shipment->id, 'local');
            $docs[] = ShipmentDocument::create([
                'shipment_id' => $shipment->id,
                'name' => $request->name ?: $file->getClientOriginalName(),
                'file_path' => $path,
                'file_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => count($docs) . ' document(s) téléchargé(s) avec succès.',
            'documents' => $docs,
        ], 201);
    }

    public function downloadDocument(ShipmentDocument $document)
    {
        $path = Storage::disk('local')->path($document->file_path);
        if (!file_exists($path)) {
            return response()->json(['message' => 'Fichier non trouvé.'], 404);
        }
        return response()->file($path, [
            'Content-Type' => $document->file_type,
            'Content-Disposition' => 'inline; filename="' . $document->name . '"',
        ]);
    }

    public function deleteDocument(ShipmentDocument $document): JsonResponse
    {
        Storage::disk('local')->delete($document->file_path);
        $document->delete();
        return response()->json(['message' => 'Document supprimé.']);
    }

    public function statuses(): JsonResponse
    {
        return response()->json(
            ShipmentStatus::where('is_active', true)->orderBy('order')->get()
        );
    }

    public function track(string $trackingNumber): JsonResponse
    {
        $shipment = Shipment::where('tracking_number', $trackingNumber)
            ->with(['status', 'history.status', 'client:id,name', 'packingLists.items', 'packingLists.photos'])
            ->firstOrFail();

        return response()->json($this->buildTrackResponse($shipment, 'tracking_number'));
    }

    public function trackByShareToken(string $shareToken): JsonResponse
    {
        $shipment = Shipment::where('share_token', $shareToken)
            ->with(['status', 'history.status', 'client:id,name', 'packingLists.items', 'packingLists.photos'])
            ->firstOrFail();

        return response()->json($this->buildTrackResponse($shipment, 'share_token'));
    }

    /**
     * Public photo accessor (no auth) — validated against the share token so
     * only photos belonging to the tracked shipment are reachable.
     */
    public function trackPhotoByShareToken(string $shareToken, \App\Models\PackingListPhoto $photo)
    {
        $shipment = Shipment::where('share_token', $shareToken)->firstOrFail();
        return $this->servePackingListPhoto($shipment, $photo);
    }

    /**
     * Public photo accessor (no auth) — gated by the shipment tracking number.
     */
    public function trackPhotoByTrackingNumber(string $trackingNumber, \App\Models\PackingListPhoto $photo)
    {
        $shipment = Shipment::where('tracking_number', $trackingNumber)->firstOrFail();
        return $this->servePackingListPhoto($shipment, $photo);
    }

    protected function servePackingListPhoto(Shipment $shipment, \App\Models\PackingListPhoto $photo)
    {
        $belongs = \App\Models\PackingList::where('id', $photo->packing_list_id)
            ->where('shipment_id', $shipment->id)
            ->exists();
        if (!$belongs) {
            return response()->json(['message' => 'Photo introuvable.'], 404);
        }
        $path = Storage::disk('local')->path($photo->file_path);
        if (!is_readable($path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }
        return response()->file($path);
    }

    /**
     * Shared response shape for the public tracking endpoints. Returns the full
     * packing-list breakdown so the tracking UI can render a detailed item table.
     * $accessor is either 'share_token' or 'tracking_number' — determines which
     * public route is used to build photo URLs.
     */
    protected function buildTrackResponse(Shipment $shipment, string $accessor = 'share_token'): array
    {
        $allStatuses = ShipmentStatus::where('is_active', true)->orderBy('order')->get();
        $photoBase = $accessor === 'tracking_number'
            ? '/api/track/' . urlencode($shipment->tracking_number) . '/photos/'
            : '/api/track/share/' . urlencode($shipment->share_token ?? '') . '/photos/';

        return [
            'shipment' => [
                'tracking_number' => $shipment->tracking_number,
                'client_name' => $shipment->client->name ?? null,
                'origin' => $shipment->origin,
                'destination' => $shipment->destination,
                'description' => $shipment->description,
                'current_status' => $shipment->status,
                'estimated_arrival' => $shipment->estimated_arrival,
                'actual_arrival' => $shipment->actual_arrival,
                'created_at' => $shipment->created_at,
                'weight' => $shipment->weight,
                'volume' => $shipment->volume,
                'quantity' => $shipment->quantity,
                'shipping_cost' => $shipment->shipping_cost,
                'other_fees' => $shipment->other_fees,
                'total_cost' => $shipment->total_cost,
                'package_type' => $shipment->package_type,
                'container_code' => $shipment->container_code,
                'packing_lists' => $shipment->packingLists->map(fn($pl) => [
                    'id' => $pl->id,
                    'reference' => $pl->reference,
                    'status' => $pl->status,
                    'parcel_count' => $pl->parcel_count,
                    'gross_weight_kg' => $pl->gross_weight_kg,
                    'header_cbm' => $pl->header_cbm,
                    'total_cbm' => $pl->total_cbm,
                    'total_weight' => $pl->total_weight,
                    'total_amount' => $pl->total_amount,
                    'price_per_cbm' => $pl->price_per_cbm,
                    'shipping_cost' => $pl->shipping_cost,
                    'additional_fees' => $pl->additional_fees,
                    'fees_description' => $pl->fees_description,
                    'notes' => $pl->notes,
                    'items' => $pl->items->map(fn($item) => [
                        'id' => $item->id,
                        'description' => $item->description,
                        'quantity' => $item->quantity,
                        'weight' => $item->weight,
                        'length' => $item->length,
                        'width' => $item->width,
                        'height' => $item->height,
                        'cbm' => $item->cbm,
                        'unit_price' => $item->unit_price,
                        'total_price' => $item->total_price,
                        'notes' => $item->notes,
                        'received_at' => $item->received_at,
                    ]),
                    'photos' => $pl->photos->map(fn($photo) => [
                        'id' => $photo->id,
                        'original_name' => $photo->original_name,
                        'url' => $photoBase . $photo->id,
                    ]),
                ]),
            ],
            'timeline' => $shipment->history->map(fn($h) => [
                'status' => $h->status->name,
                'color' => $h->status->color,
                'comment' => $h->comment,
                'location' => $h->location,
                'date' => $h->created_at,
            ]),
            'all_statuses' => $allStatuses,
        ];
    }
}
