<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlightTicket;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FlightTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = FlightTicket::with(['client', 'creator']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('trip_type')) {
            $query->where('trip_type', $request->trip_type);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('passenger_name', 'like', "%{$search}%")
                  ->orWhere('airline', 'like', "%{$search}%")
                  ->orWhere('departure_city', 'like', "%{$search}%")
                  ->orWhere('arrival_city', 'like', "%{$search}%");
            });
        }
        if ($request->filled('date_from')) {
            $query->whereDate('departure_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('departure_date', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
            'passenger_name' => 'required|string|max:255',
            'passenger_phone' => 'nullable|string|max:50',
            'passenger_email' => 'nullable|email|max:255',
            'passport_number' => 'nullable|string|max:50',
            'airline' => 'required|string|max:255',
            'flight_number' => 'nullable|string|max:50',
            'trip_type' => 'required|in:one_way,round_trip',
            'departure_airport' => 'required|string|max:10',
            'departure_city' => 'required|string|max:255',
            'departure_country' => 'nullable|string|max:255',
            'departure_date' => 'required|date',
            'arrival_airport' => 'required|string|max:10',
            'arrival_city' => 'required|string|max:255',
            'arrival_country' => 'nullable|string|max:255',
            'arrival_date' => 'nullable|date',
            'return_date' => 'nullable|required_if:trip_type,round_trip|date',
            'travel_class' => 'required|in:economy,premium_economy,business,first',
            'ticket_price' => 'required|numeric|min:0',
            'service_fee' => 'nullable|numeric|min:0',
            'taxes' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'payment_method' => 'nullable|in:cash,bank_transfer,mobile_money,card,other',
            'amount_paid' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'payment_proof' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf',
            'ticket_file' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf',
        ]);

        if ($request->hasFile('payment_proof')) {
            $validated['payment_proof_path'] = $request->file('payment_proof')->store('flight-ticket-proofs', 'public');
            unset($validated['payment_proof']);
        }
        if ($request->hasFile('ticket_file')) {
            $validated['ticket_file_path'] = $request->file('ticket_file')->store('flight-ticket-files', 'public');
            unset($validated['ticket_file']);
        }

        $serviceFee = $validated['service_fee'] ?? 0;
        $taxes = $validated['taxes'] ?? 0;
        $totalPrice = $validated['ticket_price'] + $serviceFee + $taxes;
        $amountPaid = $validated['amount_paid'] ?? 0;

        $status = 'reserved';
        if ($amountPaid >= $totalPrice && $totalPrice > 0) {
            $status = 'paid';
        } elseif ($amountPaid > 0) {
            $status = 'confirmed';
        }

        $ticket = FlightTicket::create([
            ...$validated,
            'ticket_number' => FlightTicket::generateTicketNumber(),
            'service_fee' => $serviceFee,
            'taxes' => $taxes,
            'total_price' => $totalPrice,
            'amount_paid' => $amountPaid,
            'balance_due' => $totalPrice - $amountPaid,
            'currency' => $validated['currency'] ?? 'USD',
            'status' => $status,
            'created_by' => $request->user()->id,
        ]);

        AuditService::log('created', $ticket, null, $ticket->toArray());

        return response()->json([
            'message' => 'Billet créé avec succès.',
            'ticket' => $ticket->load(['client', 'creator']),
        ], 201);
    }

    public function show(FlightTicket $flightTicket): JsonResponse
    {
        return response()->json(
            $flightTicket->load(['client', 'creator'])
        );
    }

    public function update(Request $request, FlightTicket $flightTicket): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
            'passenger_name' => 'sometimes|string|max:255',
            'passenger_phone' => 'nullable|string|max:50',
            'passenger_email' => 'nullable|email|max:255',
            'passport_number' => 'nullable|string|max:50',
            'airline' => 'sometimes|string|max:255',
            'flight_number' => 'nullable|string|max:50',
            'trip_type' => 'sometimes|in:one_way,round_trip',
            'departure_airport' => 'sometimes|string|max:10',
            'departure_city' => 'sometimes|string|max:255',
            'departure_country' => 'nullable|string|max:255',
            'departure_date' => 'sometimes|date',
            'arrival_airport' => 'sometimes|string|max:10',
            'arrival_city' => 'sometimes|string|max:255',
            'arrival_country' => 'nullable|string|max:255',
            'arrival_date' => 'nullable|date',
            'return_date' => 'nullable|date',
            'travel_class' => 'sometimes|in:economy,premium_economy,business,first',
            'ticket_price' => 'sometimes|numeric|min:0',
            'service_fee' => 'nullable|numeric|min:0',
            'taxes' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'status' => 'sometimes|in:reserved,confirmed,paid,cancelled,refunded',
            'payment_method' => 'nullable|in:cash,bank_transfer,mobile_money,card,other',
            'amount_paid' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
            'payment_proof' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf',
            'ticket_file' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf',
        ]);

        $oldValues = $flightTicket->toArray();

        if ($request->hasFile('payment_proof')) {
            if ($flightTicket->payment_proof_path) {
                Storage::disk('public')->delete($flightTicket->payment_proof_path);
            }
            $validated['payment_proof_path'] = $request->file('payment_proof')->store('flight-ticket-proofs', 'public');
            unset($validated['payment_proof']);
        }
        if ($request->hasFile('ticket_file')) {
            if ($flightTicket->ticket_file_path) {
                Storage::disk('public')->delete($flightTicket->ticket_file_path);
            }
            $validated['ticket_file_path'] = $request->file('ticket_file')->store('flight-ticket-files', 'public');
            unset($validated['ticket_file']);
        }

        // Recalculate totals if price fields changed
        $ticketPrice = $validated['ticket_price'] ?? $flightTicket->ticket_price;
        $serviceFee = $validated['service_fee'] ?? $flightTicket->service_fee;
        $taxes = $validated['taxes'] ?? $flightTicket->taxes;
        $totalPrice = $ticketPrice + $serviceFee + $taxes;
        $amountPaid = $validated['amount_paid'] ?? $flightTicket->amount_paid;

        $validated['total_price'] = $totalPrice;
        $validated['balance_due'] = $totalPrice - $amountPaid;

        // Auto-update status based on payment
        if (!isset($validated['status'])) {
            if ($amountPaid >= $totalPrice && $totalPrice > 0) {
                $validated['status'] = 'paid';
            } elseif ($amountPaid > 0) {
                $validated['status'] = 'confirmed';
            }
        }

        $flightTicket->update($validated);

        AuditService::log('updated', $flightTicket, $oldValues, $flightTicket->toArray());

        return response()->json([
            'message' => 'Billet mis à jour.',
            'ticket' => $flightTicket->load(['client', 'creator']),
        ]);
    }

    public function destroy(Request $request, FlightTicket $flightTicket): JsonResponse
    {
        if (!$request->user()->can('delete_invoices')) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        AuditService::log('deleted', $flightTicket, $flightTicket->toArray(), null);
        $flightTicket->delete();

        return response()->json(['message' => 'Billet supprimé.']);
    }

    public function downloadReceipt(FlightTicket $flightTicket)
    {
        $flightTicket->load(['client', 'creator']);
        $pdf = Pdf::loadView('flight-tickets.receipt', compact('flightTicket'));
        $passengerName = str_replace(' ', '_', $flightTicket->passenger_name);
        return $pdf->download("receipt-{$passengerName}-{$flightTicket->ticket_number}.pdf");
    }

    public function downloadProof(FlightTicket $flightTicket)
    {
        if (!$flightTicket->payment_proof_path || !Storage::disk('public')->exists($flightTicket->payment_proof_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }
        return Storage::disk('public')->download($flightTicket->payment_proof_path);
    }

    public function downloadTicketFile(FlightTicket $flightTicket)
    {
        if (!$flightTicket->ticket_file_path || !Storage::disk('public')->exists($flightTicket->ticket_file_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }
        return Storage::disk('public')->download($flightTicket->ticket_file_path);
    }

    public function stats(): JsonResponse
    {
        $totalSales = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])->sum('total_price');
        $totalCollected = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])->sum('amount_paid');
        $totalTickets = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])->count();
        $pendingPayments = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])->sum('balance_due');

        return response()->json([
            'total_sales' => $totalSales,
            'total_collected' => $totalCollected,
            'total_tickets' => $totalTickets,
            'pending_payments' => $pendingPayments,
        ]);
    }
}
