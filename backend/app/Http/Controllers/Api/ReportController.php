<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function financial(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        $revenue = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        $expenses = Expense::where('status', 'approved')
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');

        $revenueByMethod = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->selectRaw('method, SUM(amount) as total')
            ->groupBy('method')
            ->get();

        $expensesByCategory = Expense::where('status', 'approved')
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->get();

        $dailyRevenue = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->selectRaw("strftime('%Y-%m-%d', payment_date) as date, SUM(amount) as total")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'summary' => [
                'revenue' => $revenue,
                'expenses' => $expenses,
                'profit' => $revenue - $expenses,
                'margin' => $revenue > 0 ? round((($revenue - $expenses) / $revenue) * 100, 2) : 0,
            ],
            'revenue_by_method' => $revenueByMethod,
            'expenses_by_category' => $expensesByCategory,
            'daily_revenue' => $dailyRevenue,
        ]);
    }

    public function shipments(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        $total = Shipment::whereBetween('created_at', [$startDate, $endDate])->count();

        $byOrigin = Shipment::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('origin, COUNT(*) as count')
            ->groupBy('origin')
            ->get();

        $byStatus = Shipment::join('shipment_statuses', 'shipments.status_id', '=', 'shipment_statuses.id')
            ->selectRaw('shipment_statuses.name, shipment_statuses.color, COUNT(*) as count')
            ->groupBy('shipment_statuses.name', 'shipment_statuses.color')
            ->get();

        $volumeOverTime = Shipment::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $avgDeliveryTime = Shipment::whereNotNull('actual_arrival')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("AVG(julianday(actual_arrival) - julianday(created_at)) as avg_days")
            ->value('avg_days');

        return response()->json([
            'total' => $total,
            'by_origin' => $byOrigin,
            'by_status' => $byStatus,
            'volume_over_time' => $volumeOverTime,
            'avg_delivery_days' => round($avgDeliveryTime ?? 0, 1),
        ]);
    }

    public function debts(Request $request): JsonResponse
    {
        $clientsWithDebt = Client::where('total_debt', '>', 0)
            ->orderBy('total_debt', 'desc')
            ->get(['id', 'name', 'phone', 'type', 'total_debt', 'total_spent']);

        $totalDebt = $clientsWithDebt->sum('total_debt');

        $overdueAdvances = CashAdvance::with('client:id,name')
            ->whereIn('status', ['active', 'overdue'])
            ->where('due_date', '<', now())
            ->orderBy('due_date')
            ->get();

        $unpaidShipments = Shipment::with('client:id,name')
            ->where('balance_due', '>', 0)
            ->orderBy('balance_due', 'desc')
            ->limit(50)
            ->get(['id', 'tracking_number', 'client_id', 'total_cost', 'amount_paid', 'balance_due']);

        return response()->json([
            'total_debt' => $totalDebt,
            'clients_with_debt' => $clientsWithDebt,
            'overdue_advances' => $overdueAdvances,
            'unpaid_shipments' => $unpaidShipments,
        ]);
    }

    public function cashAdvances(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        $totalIssued = CashAdvance::whereBetween('issue_date', [$startDate, $endDate])->sum('amount');
        $totalDue = CashAdvance::whereIn('status', ['active', 'overdue'])->sum('total_due');
        $totalCollected = CashAdvance::whereBetween('issue_date', [$startDate, $endDate])->sum('total_paid');
        $totalOutstanding = CashAdvance::whereIn('status', ['active', 'overdue'])->sum('balance');

        $byStatus = CashAdvance::selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('status')
            ->get();

        $topBorrowers = CashAdvance::whereIn('status', ['active', 'overdue'])
            ->join('clients', 'cash_advances.client_id', '=', 'clients.id')
            ->selectRaw('clients.name, SUM(cash_advances.balance) as total_balance')
            ->groupBy('clients.name')
            ->orderBy('total_balance', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'summary' => [
                'total_issued' => $totalIssued,
                'total_due' => $totalDue,
                'total_collected' => $totalCollected,
                'total_outstanding' => $totalOutstanding,
            ],
            'by_status' => $byStatus,
            'top_borrowers' => $topBorrowers,
        ]);
    }
}
