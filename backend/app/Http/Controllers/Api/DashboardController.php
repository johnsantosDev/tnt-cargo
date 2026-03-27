<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month');
        $startDate = match ($period) {
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        $totalRevenue = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $startDate)
            ->sum('amount');

        $totalExpenses = Expense::where('status', 'approved')
            ->where('expense_date', '>=', $startDate)
            ->sum('amount');

        $totalShipments = Shipment::where('created_at', '>=', $startDate)->count();
        $activeShipments = Shipment::whereHas('status', fn($q) => $q->whereNotIn('slug', ['delivered']))->count();

        $totalDebt = Client::sum('total_debt');
        $totalClients = Client::count();

        $pendingCashAdvances = CashAdvance::whereIn('status', ['active', 'overdue'])->sum('balance');

        $revenueChart = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $startDate)
            ->selectRaw("DATE(payment_date) as date, SUM(amount) as total")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $shipmentsByStatus = Shipment::join('shipment_statuses', 'shipments.status_id', '=', 'shipment_statuses.id')
            ->selectRaw('shipment_statuses.name, shipment_statuses.color, COUNT(*) as count')
            ->groupBy('shipment_statuses.name', 'shipment_statuses.color')
            ->get();

        $recentShipments = Shipment::with(['client', 'status'])
            ->latest()
            ->limit(10)
            ->get();

        $recentPayments = Payment::with(['client', 'shipment'])
            ->latest()
            ->limit(10)
            ->get();

        $overdueAdvances = CashAdvance::with('client')
            ->where('status', 'overdue')
            ->orWhere(function ($q) {
                $q->where('status', 'active')
                    ->where('due_date', '<', now());
            })
            ->limit(10)
            ->get();

        $unpaidInvoices = Invoice::with('client')
            ->whereIn('status', ['sent', 'overdue', 'partial'])
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        return response()->json([
            'kpis' => [
                'total_revenue' => $totalRevenue,
                'total_expenses' => $totalExpenses,
                'net_profit' => $totalRevenue - $totalExpenses,
                'total_shipments' => $totalShipments,
                'active_shipments' => $activeShipments,
                'total_debt' => $totalDebt,
                'total_clients' => $totalClients,
                'pending_cash_advances' => $pendingCashAdvances,
            ],
            'charts' => [
                'revenue' => $revenueChart,
                'shipments_by_status' => $shipmentsByStatus,
            ],
            'recent' => [
                'shipments' => $recentShipments,
                'payments' => $recentPayments,
            ],
            'alerts' => [
                'overdue_advances' => $overdueAdvances,
                'unpaid_invoices' => $unpaidInvoices,
            ],
        ]);
    }
}
