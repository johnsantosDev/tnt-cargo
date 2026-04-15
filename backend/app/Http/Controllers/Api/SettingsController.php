<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\ShipmentStatus;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Setting::all();
        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
        ]);

        foreach ($validated['settings'] as $setting) {
            Setting::where('key', $setting['key'])->update(['value' => $setting['value']]);
        }

        return response()->json(['message' => 'Paramètres mis à jour.']);
    }

    public function updateSingle(Request $request, Setting $setting): JsonResponse
    {
        $validated = $request->validate([
            'value' => 'nullable',
        ]);

        $setting->update(['value' => $validated['value']]);

        return response()->json(['message' => 'Paramètre mis à jour.', 'setting' => $setting]);
    }

    public function deleteUser(User $user): JsonResponse
    {
        if (!auth()->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 403);
        }

        AuditService::log('deleted', $user, $user->toArray(), null);
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    public function shipmentStatuses(): JsonResponse
    {
        return response()->json(
            ShipmentStatus::orderBy('order')->get()
        );
    }

    public function updateShipmentStatus(Request $request, ShipmentStatus $status): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'color' => 'sometimes|string|max:7',
            'icon' => 'nullable|string|max:50',
            'order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $status->update($validated);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'status' => $status,
        ]);
    }

    public function createShipmentStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:50|unique:shipment_statuses',
            'color' => 'required|string|max:7',
            'icon' => 'nullable|string|max:50',
            'order' => 'nullable|integer|min:0',
        ]);

        $status = ShipmentStatus::create($validated);

        return response()->json([
            'message' => 'Statut créé.',
            'status' => $status,
        ], 201);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(15));
    }

    public function createUser(Request $request): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|exists:roles,name',
            'locale' => 'nullable|in:fr,en',
        'region' => 'nullable|string|max:100',
    ]);

    $user = User::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => $validated['password'],
        'phone' => $validated['phone'] ?? null,
        'locale' => $validated['locale'] ?? 'fr',
        'region' => $validated['region'] ?? null,
    ]);
    $user->assignRole($validated['role']);

        AuditService::log('created', $user, null, $user->toArray());

        return response()->json([
            'message' => 'Utilisateur créé.',
            'user' => $user->load('roles'),
        ], 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['admin', 'manager'])) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'role' => 'sometimes|exists:roles,name',
            'is_active' => 'sometimes|boolean',
            'locale' => 'nullable|in:fr,en',
            'region' => 'nullable|string|max:100',
        ]);

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
            unset($validated['role']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Utilisateur mis à jour.',
            'user' => $user->load('roles'),
        ]);
    }

    public function roles(): JsonResponse
    {
        return response()->json(Role::with('permissions')->get());
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::with('user');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('model_type')) {
            $query->where('model_type', 'like', "%{$request->model_type}%");
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate(20)
        );
    }
}
