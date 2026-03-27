<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function getDateRange(Request $request): array
    {
        if ($request->filled('start_date') && $request->filled('end_date')) {
            return [$request->start_date, $request->end_date];
        }

        $period = $request->get('period', 'month');
        $end = now()->toDateString();
        $start = match($period) {
            'day', 'daily' => now()->subDays(30)->toDateString(),
            'week', 'weekly' => now()->subWeeks(12)->toDateString(),
            'month', 'monthly' => now()->subMonths(12)->toDateString(),
            'year', 'yearly' => now()->subYears(5)->toDateString(),
            default => now()->subMonth()->toDateString(),
        };
        return [$start, $end];
    }

    private function getGroupByExpression(Request $request): array
    {
        $groupBy = $request->get('group_by', 'daily');
        return match($groupBy) {
            'weekly' => ["YEARWEEK(%s, 1) as period, MIN(DATE(%s)) as date", "YEARWEEK(%s, 1)"],
            'monthly' => ["DATE_FORMAT(%s, '%%Y-%%m') as period, DATE_FORMAT(%s, '%%Y-%%m') as date", "DATE_FORMAT(%s, '%%Y-%%m')"],
            'yearly' => ["YEAR(%s) as period, YEAR(%s) as date", "YEAR(%s)"],
            default => ["DATE(%s) as period, DATE(%s) as date", "DATE(%s)"],
        };
    }

    private function exportCsv(array $rows, string $filename)
    {
        $callback = function () use ($rows) {
            $f = fopen('php://output', 'w');
            if (!empty($rows)) {
                fputcsv($f, array_keys($rows[0]));
                foreach ($rows as $row) {
                    fputcsv($f, $row);
                }
            }
            fclose($f);
        };
        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ]);
    }

    private function exportPdf(string $view, array $data, string $filename)
    {
        $pdf = Pdf::loadView($view, $data)->setPaper('a4', 'landscape');
        return $pdf->download("{$filename}.pdf");
    }

    public function financial(Request $request)
    {
        [$startDate, $endDate] = $this->getDateRange($request);

        $revenue = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        // Also include all-time if period is too small
        $totalRevenue = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->sum('amount');

        $expenses = Expense::where('status', 'approved')
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');

        $totalExpenses = Expense::where('status', 'approved')->sum('amount');

        // Use all-time if filtered period has no data
        $displayRevenue = $revenue > 0 ? $revenue : $totalRevenue;
        $displayExpenses = $expenses > 0 ? $expenses : $totalExpenses;

        // Chart data - group by selected period
        $chartData = [];
        [$selectExpr, $groupExpr] = $this->getGroupByExpression($request);

        $revenueSelect = sprintf($selectExpr, 'payment_date', 'payment_date');
        $revenueGroup = sprintf($groupExpr, 'payment_date');
        $revenueByDate = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->selectRaw("{$revenueSelect}, SUM(amount) as total")
            ->groupBy(DB::raw($revenueGroup))
            ->orderBy('date')
            ->limit(60)
            ->get()
            ->keyBy('date');

        $expenseSelect = sprintf($selectExpr, 'expense_date', 'expense_date');
        $expenseGroup = sprintf($groupExpr, 'expense_date');
        $expensesByDate = Expense::where('status', 'approved')
            ->selectRaw("{$expenseSelect}, SUM(amount) as total")
            ->groupBy(DB::raw($expenseGroup))
            ->orderBy('date')
            ->limit(60)
            ->get()
            ->keyBy('date');

        $allDates = $revenueByDate->keys()->merge($expensesByDate->keys())->unique()->sort();
        foreach ($allDates as $date) {
            $chartData[] = [
                'date' => $date,
                'revenue' => (float)($revenueByDate[$date]->total ?? 0),
                'expenses' => (float)($expensesByDate[$date]->total ?? 0),
            ];
        }

        // If no chart data, generate from shipment payments
        if (empty($chartData)) {
            $shipmentPayments = Shipment::whereNotNull('amount_paid')
                ->where('amount_paid', '>', 0)
                ->selectRaw("DATE(created_at) as date, SUM(amount_paid) as revenue, SUM(COALESCE(customs_fee,0) + COALESCE(shipping_cost,0)) as expenses")
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->limit(30)
                ->get();
            foreach ($shipmentPayments as $sp) {
                $chartData[] = [
                    'date' => $sp->date,
                    'revenue' => (float)$sp->revenue,
                    'expenses' => (float)$sp->expenses,
                ];
            }
        }

        // Fallback to shipment-based revenue if no payments
        if ($displayRevenue == 0) {
            $displayRevenue = Shipment::sum('amount_paid');
        }
        if ($displayExpenses == 0) {
            $displayExpenses = Shipment::sum(DB::raw('COALESCE(customs_fee,0) + COALESCE(shipping_cost,0) + COALESCE(other_fees,0)'));
        }

        $netProfit = $displayRevenue - $displayExpenses;
        $margin = $displayRevenue > 0 ? round(($netProfit / $displayRevenue) * 100, 1) : 0;

        if ($request->filled('export')) {
            $rows = array_map(fn($c) => [
                'Date' => $c['date'], 'Revenus' => $c['revenue'], 'Dépenses' => $c['expenses'],
            ], $chartData);
            array_unshift($rows, ['Date' => 'TOTAL', 'Revenus' => $displayRevenue, 'Dépenses' => $displayExpenses]);
            if ($request->export === 'pdf') {
                return $this->exportPdf('reports.financial', compact('displayRevenue', 'displayExpenses', 'netProfit', 'margin', 'chartData'), 'rapport-financier');
            }
            return $this->exportCsv($rows, 'rapport-financier');
        }

        return response()->json([
            'summary' => [
                'total_revenue' => (float)$displayRevenue,
                'total_expenses' => (float)$displayExpenses,
                'net_profit' => (float)$netProfit,
                'margin' => $margin,
            ],
            'chart' => $chartData,
        ]);
    }

    public function shipments(Request $request)
    {
        $total = Shipment::count();

        $deliveredStatus = ShipmentStatus::where('slug', 'delivered')->first();
        $delivered = $deliveredStatus ? Shipment::where('status_id', $deliveredStatus->id)->count() : 0;

        $transitStatuses = ShipmentStatus::whereIn('slug', ['in-transit', 'customs', 'warehouse'])->pluck('id');
        $inTransit = Shipment::whereIn('status_id', $transitStatuses)->count();

        $byOrigin = Shipment::selectRaw('origin, COUNT(*) as count')
            ->groupBy('origin')
            ->get();

        $byStatus = Shipment::join('shipment_statuses', 'shipments.status_id', '=', 'shipment_statuses.id')
            ->selectRaw('shipment_statuses.name, shipment_statuses.color, COUNT(*) as count')
            ->groupBy('shipment_statuses.name', 'shipment_statuses.color')
            ->get();

        if ($request->filled('export')) {
            $rows = [];
            foreach ($byStatus as $s) {
                $rows[] = ['Statut' => $s->name, 'Nombre' => $s->count];
            }
            foreach ($byOrigin as $o) {
                $rows[] = ['Origine' => $o->origin, 'Nombre' => $o->count];
            }
            if ($request->export === 'pdf') {
                return $this->exportPdf('reports.shipments', compact('total', 'delivered', 'inTransit', 'byStatus', 'byOrigin'), 'rapport-expeditions');
            }
            return $this->exportCsv($rows, 'rapport-expeditions');
        }

        return response()->json([
            'summary' => [
                'total' => $total,
                'delivered' => $delivered,
                'in_transit' => $inTransit,
            ],
            'by_status' => $byStatus,
            'by_origin' => $byOrigin,
        ]);
    }

    public function debts(Request $request)
    {
        // Calculate from shipments with balance
        $unpaidShipments = Shipment::with('client:id,name,phone')
            ->where('balance_due', '>', 0)
            ->orderBy('balance_due', 'desc')
            ->get();

        $totalDebt = $unpaidShipments->sum('balance_due');

        // Group debts by client
        $debtByClient = $unpaidShipments->groupBy('client_id')->map(function($shipments) {
            $client = $shipments->first()->client;
            return [
                'name' => $client?->name ?? 'Unknown',
                'phone' => $client?->phone ?? '',
                'total_debt' => (float)$shipments->sum('balance_due'),
                'shipment_count' => $shipments->count(),
            ];
        })->sortByDesc('total_debt')->values()->take(15);

        $clientsCount = $debtByClient->count();
        $avgDebt = $clientsCount > 0 ? round($totalDebt / $clientsCount, 2) : 0;

        if ($request->filled('export')) {
            $rows = $debtByClient->map(fn($d) => [
                'Client' => $d['name'], 'Téléphone' => $d['phone'],
                'Dette' => $d['total_debt'], 'Expéditions' => $d['shipment_count'],
            ])->toArray();
            if ($request->export === 'pdf') {
                return $this->exportPdf('reports.debts', compact('totalDebt', 'clientsCount', 'avgDebt', 'debtByClient'), 'rapport-dettes');
            }
            return $this->exportCsv($rows, 'rapport-dettes');
        }

        return response()->json([
            'total_debt' => (float)$totalDebt,
            'clients_count' => $clientsCount,
            'avg_debt' => (float)$avgDebt,
            'top_debtors' => $debtByClient,
        ]);
    }

    public function cashAdvances(Request $request)
    {
        $totalAdvanced = CashAdvance::sum('amount');
        $totalRecovered = CashAdvance::sum('total_paid');
        $outstanding = CashAdvance::whereIn('status', ['pending', 'partial', 'active', 'overdue'])
            ->sum(DB::raw('COALESCE(total_due, amount) - COALESCE(total_paid, 0)'));
        $overdueCount = CashAdvance::where('status', 'overdue')
            ->orWhere(function($q) {
                $q->whereIn('status', ['pending', 'partial', 'active'])
                  ->where('due_date', '<', now());
            })
            ->count();

        // Trend data
        $trend = CashAdvance::selectRaw("DATE(created_at) as date, SUM(amount) as advanced, SUM(COALESCE(total_paid,0)) as recovered")
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->limit(30)
            ->get();

        if ($request->filled('export')) {
            $rows = $trend->map(fn($t) => [
                'Date' => $t->date, 'Avancé' => $t->advanced, 'Récupéré' => $t->recovered,
            ])->toArray();
            array_unshift($rows, ['Date' => 'TOTAL', 'Avancé' => $totalAdvanced, 'Récupéré' => $totalRecovered]);
            if ($request->export === 'pdf') {
                return $this->exportPdf('reports.cash-advances', compact('totalAdvanced', 'totalRecovered', 'outstanding', 'overdueCount', 'trend'), 'rapport-avances');
            }
            return $this->exportCsv($rows, 'rapport-avances');
        }

        return response()->json([
            'total_advanced' => (float)$totalAdvanced,
            'total_recovered' => (float)$totalRecovered,
            'outstanding' => (float)$outstanding,
            'overdue_count' => $overdueCount,
            'trend' => $trend,
        ]);
    }
}
