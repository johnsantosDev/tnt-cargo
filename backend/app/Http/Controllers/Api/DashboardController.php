<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Shipment;
use App\Support\RegionContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month');
        $startDate = match ($period) {
            'day', 'daily' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        $user = $request->user();
        $isManager = RegionContext::isManager($user);

        $revenueQuery = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $startDate);
        RegionContext::apply($revenueQuery, $request);
        $totalRevenue = $revenueQuery->sum('amount');

        $expenseQuery = Expense::where('status', 'approved')
            ->where('expense_date', '>=', $startDate);
        RegionContext::apply($expenseQuery, $request);
        $totalExpenses = $expenseQuery->sum('amount');

        $shipmentQuery = Shipment::where('created_at', '>=', $startDate);
        RegionContext::apply($shipmentQuery, $request);
        $totalShipments = $shipmentQuery->count();

        $activeShipmentQuery = Shipment::whereHas('status', fn($q) => $q->whereNotIn('slug', ['delivered']));
        RegionContext::apply($activeShipmentQuery, $request);
        $activeShipments = $activeShipmentQuery->count();

        $clientQuery = Client::query();
        RegionContext::apply($clientQuery, $request);
        $totalDebt = $clientQuery->sum('total_debt');
        $totalClients = (clone $clientQuery)->count();

        $advanceQuery = CashAdvance::whereIn('status', ['active', 'overdue']);
        RegionContext::apply($advanceQuery, $request);
        $pendingCashAdvances = $advanceQuery->sum('balance');

        $revenueChartQuery = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $startDate)
            ->selectRaw("DATE(payment_date) as date, SUM(amount) as total")
            ->groupBy('date')
            ->orderBy('date');
        RegionContext::apply($revenueChartQuery, $request);
        $revenueChart = $revenueChartQuery->get();

        $shipmentsByStatusQuery = Shipment::join('shipment_statuses', 'shipments.status_id', '=', 'shipment_statuses.id')
            ->selectRaw('shipment_statuses.name, shipment_statuses.color, COUNT(*) as count')
            ->groupBy('shipment_statuses.name', 'shipment_statuses.color');
        RegionContext::apply($shipmentsByStatusQuery, $request, 'shipments.region');
        $shipmentsByStatus = $shipmentsByStatusQuery->get();

        $recentShipmentQuery = Shipment::with(['client', 'status'])->latest()->limit(10);
        RegionContext::apply($recentShipmentQuery, $request);
        $recentShipments = $recentShipmentQuery->get();

        $recentPaymentQuery = Payment::with(['client', 'shipment'])->latest()->limit(10);
        RegionContext::apply($recentPaymentQuery, $request);
        $recentPayments = $recentPaymentQuery->get();

        $overdueAdvanceQuery = CashAdvance::with('client')
            ->where(function ($q) {
                $q->where('status', 'overdue')
                    ->orWhere(function ($q2) {
                        $q2->where('status', 'active')->where('due_date', '<', now());
                    });
            })
            ->limit(10);
        RegionContext::apply($overdueAdvanceQuery, $request);
        $overdueAdvances = $overdueAdvanceQuery->get();

        $unpaidInvoiceQuery = Invoice::with('client')
            ->whereIn('status', ['sent', 'overdue', 'partial'])
            ->orderBy('due_date')
            ->limit(10);
        RegionContext::apply($unpaidInvoiceQuery, $request);
        $unpaidInvoices = $unpaidInvoiceQuery->get();

        // Daily report data
        $todayRevenue = Payment::where('type', 'income')->where('status', 'completed')
            ->whereDate('payment_date', today());
        RegionContext::apply($todayRevenue, $request);

        $todayExpenses = Expense::where('status', 'approved')
            ->whereDate('expense_date', today());
        RegionContext::apply($todayExpenses, $request);

        $todayShipments = Shipment::whereDate('created_at', today());
        RegionContext::apply($todayShipments, $request);

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
            'daily' => [
                'revenue' => (float) $todayRevenue->sum('amount'),
                'expenses' => (float) $todayExpenses->sum('amount'),
                'shipments' => $todayShipments->count(),
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
