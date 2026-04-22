<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transfer;
use App\Services\AuditService;
use App\Support\RegionContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class TransferController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Transfer::with(['client', 'creator', 'approver', 'completer']);
        RegionContext::apply($query, $request);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhere('transfer_code', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('client_phone', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required_without:client_id|string|max:255',
            'client_phone' => 'nullable|string|max:20',
            'amount' => 'required|numeric|min:0.01',
            'transfer_fee' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'origin_region' => 'required|string|max:100',
            'destination_region' => 'required|string|max:100',
            'region' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if (!empty($validated['client_id']) && empty($validated['client_name'])) {
            $client = \App\Models\Client::find($validated['client_id']);
            $validated['client_name'] = $client?->name;
            $validated['client_phone'] = $validated['client_phone'] ?? $client?->phone;
        }

        $documentPath = null;
        if ($request->hasFile('document')) {
            $documentPath = $request->file('document')->store('transfers/documents', 'public');
        }

        $region = RegionContext::resolveWriteRegion($request, $validated['region'] ?? $validated['origin_region'] ?? null);

        $transfer = Transfer::create([
            ...$validated,
            'reference' => Transfer::generateReference(),
            'transfer_code' => Transfer::generateTransferCode(),
            'qr_token' => Transfer::generateQrToken(),
            'currency' => $validated['currency'] ?? 'USD',
            'transfer_fee' => $validated['transfer_fee'] ?? 50,
            'status' => 'pending_approval',
            'region' => $region,
            'document_path' => $documentPath,
            'created_by' => $request->user()->id,
        ]);

        AuditService::log('created', $transfer, null, $transfer->toArray());

        return response()->json([
            'message' => 'Transfer enregistré et en attente de validation manager.',
            'transfer' => $transfer->load(['client', 'creator']),
        ], 201);
    }

    public function show(Transfer $transfer): JsonResponse
    {
        return response()->json(['data' => $transfer->load(['client', 'creator', 'approver', 'completer'])]);
    }

    public function approve(Request $request, Transfer $transfer): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Seuls les managers peuvent approuver un transfer.'], 403);
        }

        if ($transfer->status !== 'pending_approval') {
            return response()->json(['message' => 'Ce transfer n\'est pas en attente de validation.'], 422);
        }

        $transfer->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        AuditService::log('approved', $transfer, ['status' => 'pending_approval'], ['status' => 'approved']);

        return response()->json([
            'message' => 'Transfer approuvé.',
            'transfer' => $transfer->fresh()->load(['client', 'creator', 'approver']),
        ]);
    }

    public function reject(Request $request, Transfer $transfer): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Seuls les managers peuvent rejeter un transfer.'], 403);
        }

        if ($transfer->status !== 'pending_approval') {
            return response()->json(['message' => 'Ce transfer ne peut plus etre rejeté.'], 422);
        }

        $transfer->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        AuditService::log('rejected', $transfer, ['status' => 'pending_approval'], ['status' => 'rejected']);

        return response()->json([
            'message' => 'Transfer rejeté.',
            'transfer' => $transfer->fresh(),
        ]);
    }

    public function complete(Request $request, Transfer $transfer): JsonResponse
    {
        if ($transfer->status !== 'approved') {
            return response()->json(['message' => 'Le transfer doit etre approuvé avant completion.'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $transfer->update([
            'status' => 'completed',
            'completed_by' => $request->user()->id,
            'completed_at' => now(),
            'notes' => $validated['notes'] ?? $transfer->notes,
        ]);

        AuditService::log('completed', $transfer, ['status' => 'approved'], ['status' => 'completed']);

        return response()->json([
            'message' => 'Transfer complété. Le client a recu les fonds.',
            'transfer' => $transfer->fresh()->load(['client', 'creator', 'approver', 'completer']),
        ]);
    }

    public function downloadReceipt(Transfer $transfer)
    {
        $verificationUrl = url("/api/transfers/verify/{$transfer->qr_token}");
        $qrSvg = QrCode::size(140)->generate($verificationUrl);
        $qrBase64 = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        $pdf = Pdf::loadView('transfers.receipt', [
            'transfer' => $transfer->load(['client', 'creator', 'approver']),
            'verificationUrl' => $verificationUrl,
            'qrBase64' => $qrBase64,
        ]);

        $timestamp = now()->format('dmYHis');
        return $pdf->download("transfer-receipt-{$transfer->reference}-{$timestamp}.pdf");
    }

    public function downloadCompletion(Transfer $transfer)
    {
        if ($transfer->status !== 'completed') {
            return response()->json(['message' => 'Le transfer n\'est pas encore complété.'], 422);
        }

        $pdf = Pdf::loadView('transfers.completion', [
            'transfer' => $transfer->load(['client', 'creator', 'approver', 'completer']),
        ]);

        $timestamp = now()->format('dmYHis');
        return $pdf->download("transfer-completion-{$transfer->reference}-{$timestamp}.pdf");
    }

    public function verify(string $qrToken)
    {
        $transfer = Transfer::with(['creator', 'approver', 'completer'])->where('qr_token', $qrToken)->first();

        if (!$transfer) {
            return view('transfers.verify', ['transfer' => null]);
        }

        return view('transfers.verify', ['transfer' => $transfer]);
    }

    public function downloadDocument(Transfer $transfer)
    {
        if (!$transfer->document_path || !Storage::disk('public')->exists($transfer->document_path)) {
            return response()->json(['message' => 'Aucun document trouvé.'], 404);
        }

        $path = Storage::disk('public')->path($transfer->document_path);
        $filename = basename($transfer->document_path);
        return response()->download($path, $filename);
    }

    public function uploadSignedDocument(Request $request, Transfer $transfer): JsonResponse
    {
        if ($transfer->status !== 'completed') {
            return response()->json(['message' => 'Le transfer doit être complété avant de pouvoir téléverser un document signé.'], 422);
        }

        $request->validate([
            'signed_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $path = $request->file('signed_document')->store('transfers/signed', 'public');
        $transfer->update(['signed_document_path' => $path]);

        return response()->json([
            'message' => 'Document signé téléversé avec succès.',
            'transfer' => $transfer->fresh()->load(['client', 'creator', 'approver', 'completer']),
        ]);
    }

    public function downloadSignedDocument(Transfer $transfer)
    {
        if (!$transfer->signed_document_path || !Storage::disk('public')->exists($transfer->signed_document_path)) {
            return response()->json(['message' => 'Aucun document signé trouvé.'], 404);
        }

        $path = Storage::disk('public')->path($transfer->signed_document_path);
        $filename = 'signed-completion-' . $transfer->reference . '.' . pathinfo($transfer->signed_document_path, PATHINFO_EXTENSION);
        return response()->download($path, $filename);
    }
}
