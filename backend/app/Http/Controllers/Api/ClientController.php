<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Client::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%");
            });
        }
        if ($request->filled('has_debt')) {
            $query->where('total_debt', '>', 0);
        }

        $sortField = $request->get('sort', 'created_at');
        $sortDir = $request->get('direction', 'desc');
        $query->orderBy($sortField, $sortDir);

        return response()->json($query->paginate($request->get('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'phone_secondary' => 'nullable|string|max:20',
            'company' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'type' => 'nullable|in:vip,regular,new',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = $request->user()->id;

        $client = Client::create($validated);
        AuditService::log('created', $client, null, $client->toArray());

        return response()->json([
            'message' => 'Client créé avec succès.',
            'client' => $client,
        ], 201);
    }

    public function show(Client $client): JsonResponse
    {
        $client->load(['shipments.status', 'payments', 'cashAdvances', 'invoices']);

        return response()->json($client);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'phone_secondary' => 'nullable|string|max:20',
            'company' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'type' => 'nullable|in:vip,regular,new',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $oldValues = $client->toArray();
        $client->update($validated);
        AuditService::log('updated', $client, $oldValues, $client->toArray());

        return response()->json([
            'message' => 'Client mis à jour.',
            'client' => $client,
        ]);
    }

    public function destroy(Client $client): JsonResponse
    {
        AuditService::log('deleted', $client, $client->toArray(), null);
        $client->delete();

        return response()->json(['message' => 'Client supprimé.']);
    }
}
