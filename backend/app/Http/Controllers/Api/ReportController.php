<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Expense;
use App\Models\FlightTicket;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use App\Models\Transfer;
use App\Support\RegionContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function getDateRange(Request $request): array
    {
        if ($request->filled('start_date') && $request->filled('end_date')) {
            return [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59'];
        }

        $period = $request->get('period', 'month');
        $end = now()->endOfDay()->toDateTimeString();
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
        $timestamp = now()->format('dmYHis');
        $pdf = Pdf::loadView($view, $data)->setPaper('a4', 'landscape');
        return $pdf->download("{$filename}-{$timestamp}.pdf");
    }

    public function financial(Request $request)
    {
        [$startDate, $endDate] = $this->getDateRange($request);

        $revenueQ = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startDate, $endDate]);
        RegionContext::apply($revenueQ, $request);
        $revenue = $revenueQ->sum('amount');

        $totalRevenueQ = Payment::where('type', 'income')
            ->where('status', 'completed');
        RegionContext::apply($totalRevenueQ, $request);
        $totalRevenue = $totalRevenueQ->sum('amount');

        $expensesQ = Expense::where('status', 'approved')
            ->whereBetween('expense_date', [$startDate, $endDate]);
        RegionContext::apply($expensesQ, $request);
        $expenses = $expensesQ->sum('amount');

        $totalExpensesQ = Expense::where('status', 'approved');
        RegionContext::apply($totalExpensesQ, $request);
        $totalExpenses = $totalExpensesQ->sum('amount');

        $flightRevenueQ = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])
            ->whereBetween('created_at', [$startDate, $endDate]);
        RegionContext::apply($flightRevenueQ, $request);
        $flightRevenue = $flightRevenueQ->sum('amount_paid');

        $totalFlightRevenueQ = FlightTicket::whereNotIn('status', ['cancelled', 'refunded']);
        RegionContext::apply($totalFlightRevenueQ, $request);
        $totalFlightRevenue = $totalFlightRevenueQ->sum('amount_paid');

        // Use all-time if filtered period has no data
        $displayRevenue = $revenue > 0 ? $revenue : $totalRevenue;
        $displayExpenses = $expenses > 0 ? $expenses : $totalExpenses;
        $displayFlightRevenue = $flightRevenue > 0 ? $flightRevenue : $totalFlightRevenue;
        $displayRevenue += $displayFlightRevenue;

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
            ->limit(60);
        RegionContext::apply($revenueByDate, $request);
        $revenueByDate = $revenueByDate->get()->keyBy('date');

        $expenseSelect = sprintf($selectExpr, 'expense_date', 'expense_date');
        $expenseGroup = sprintf($groupExpr, 'expense_date');
        $expensesByDate = Expense::where('status', 'approved')
            ->selectRaw("{$expenseSelect}, SUM(amount) as total")
            ->groupBy(DB::raw($expenseGroup))
            ->orderBy('date')
            ->limit(60);
        RegionContext::apply($expensesByDate, $request);
        $expensesByDate = $expensesByDate->get()->keyBy('date');

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
                ->limit(30);
            RegionContext::apply($shipmentPayments, $request);
            foreach ($shipmentPayments->get() as $sp) {
                $chartData[] = [
                    'date' => $sp->date,
                    'revenue' => (float)$sp->revenue,
                    'expenses' => (float)$sp->expenses,
                ];
            }
        }

        // Fallback to shipment-based revenue if no payments
        if ($displayRevenue == 0) {
            $fallbackRevenueQ = Shipment::query();
            RegionContext::apply($fallbackRevenueQ, $request);
            $displayRevenue = $fallbackRevenueQ->sum('amount_paid');
        }
        if ($displayExpenses == 0) {
            $fallbackExpenseQ = Shipment::query();
            RegionContext::apply($fallbackExpenseQ, $request);
            $displayExpenses = $fallbackExpenseQ->sum(DB::raw('COALESCE(customs_fee,0) + COALESCE(shipping_cost,0) + COALESCE(other_fees,0)'));
        }

        $netProfit = $displayRevenue - $displayExpenses;
        $margin = $displayRevenue > 0 ? round(($netProfit / $displayRevenue) * 100, 1) : 0;

        if ($request->filled('export')) {
            $rows = array_map(fn($c) => [
                'Date' => $c['date'], 'Revenus' => $c['revenue'], 'Dépenses' => $c['expenses'],
            ], $chartData);
            array_unshift($rows, ['Date' => 'TOTAL', 'Revenus' => $displayRevenue, 'Dépenses' => $displayExpenses]);

            // Region breakdown for PDF
            $regionBreakdown = [];
            $selectedRegion = $request->get('region');
            if (empty($selectedRegion) && RegionContext::isManager($request->user())) {
                $regions = ['Goma', 'Beni', 'Butembo', 'Lubumbashi', 'Kolwezi', 'Kinshasa', 'Bukavu', 'China', 'Dubai'];
                foreach ($regions as $r) {
                    $rRev = Payment::where('type', 'income')->where('status', 'completed')
                        ->whereBetween('payment_date', [$startDate, $endDate])->where('region', $r)->sum('amount');
                    $rFlight = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])
                        ->whereBetween('created_at', [$startDate, $endDate])->where('region', $r)->sum('amount_paid');
                    $rExp = Expense::where('status', 'approved')
                        ->whereBetween('expense_date', [$startDate, $endDate])->where('region', $r)->sum('amount');
                    $rTotal = $rRev + $rFlight;
                    if ($rTotal > 0 || $rExp > 0) {
                        $regionBreakdown[] = ['region' => $r, 'revenue' => (float)$rTotal, 'expenses' => (float)$rExp, 'profit' => (float)($rTotal - $rExp)];
                    }
                }
            }

            $pdfData = compact('displayRevenue', 'displayExpenses', 'netProfit', 'margin', 'chartData', 'displayFlightRevenue', 'regionBreakdown');
            $pdfData['selectedRegion'] = $selectedRegion ?: 'Toutes les régions';
            $pdfData['periodLabel'] = $request->filled('start_date') ? $request->start_date . ' — ' . $request->end_date : ucfirst($request->get('period', 'month'));

            if ($request->export === 'pdf') {
                // Top revenue clients
                $topClientsQ = Payment::where('payments.type', 'income')->where('payments.status', 'completed')
                    ->whereBetween('payment_date', [$startDate, $endDate])
                    ->join('shipments', 'payments.shipment_id', '=', 'shipments.id')
                    ->join('clients', 'shipments.client_id', '=', 'clients.id')
                    ->selectRaw('clients.name, clients.phone, COUNT(DISTINCT payments.id) as payment_count, SUM(payments.amount) as total')
                    ->groupBy('clients.id', 'clients.name', 'clients.phone')
                    ->orderByDesc('total')
                    ->limit(10);
                RegionContext::apply($topClientsQ, $request, 'payments.region');
                $pdfData['topClients'] = $topClientsQ->get();

                // Recent payments
                $recentPaymentsQ = Payment::where('type', 'income')->where('status', 'completed')
                    ->whereBetween('payment_date', [$startDate, $endDate])
                    ->with('shipment.client')
                    ->orderByDesc('payment_date')
                    ->limit(20);
                RegionContext::apply($recentPaymentsQ, $request);
                $pdfData['recentPayments'] = $recentPaymentsQ->get();

                // Expense categories
                $expCatQ = Expense::where('status', 'approved')
                    ->whereBetween('expense_date', [$startDate, $endDate])
                    ->selectRaw('category, COUNT(*) as count, SUM(amount) as total')
                    ->groupBy('category')
                    ->orderByDesc('total');
                RegionContext::apply($expCatQ, $request);
                $pdfData['expenseCategories'] = $expCatQ->get();

                // Recent expenses
                $recentExpQ = Expense::where('status', 'approved')
                    ->whereBetween('expense_date', [$startDate, $endDate])
                    ->orderByDesc('expense_date')
                    ->limit(20);
                RegionContext::apply($recentExpQ, $request);
                $pdfData['recentExpenses'] = $recentExpQ->get();

                return $this->exportPdf('reports.financial', $pdfData, 'rapport-financier');
            }
            return $this->exportCsv($rows, 'rapport-financier');
        }

        return response()->json([
            'summary' => [
                'total_revenue' => (float)$displayRevenue,
                'total_expenses' => (float)$displayExpenses,
                'net_profit' => (float)$netProfit,
                'margin' => $margin,
                'flight_ticket_revenue' => (float)$displayFlightRevenue,
            ],
            'chart' => $chartData,
        ]);
    }

    public function shipments(Request $request)
    {
        $totalQ = Shipment::query();
        RegionContext::apply($totalQ, $request);
        $total = $totalQ->count();

        $deliveredStatus = ShipmentStatus::where('slug', 'delivered')->first();
        $deliveredQ = $deliveredStatus ? Shipment::where('status_id', $deliveredStatus->id) : Shipment::whereRaw('0');
        RegionContext::apply($deliveredQ, $request);
        $delivered = $deliveredQ->count();

        $transitStatuses = ShipmentStatus::whereIn('slug', ['in-transit', 'customs', 'warehouse'])->pluck('id');
        $inTransitQ = Shipment::whereIn('status_id', $transitStatuses);
        RegionContext::apply($inTransitQ, $request);
        $inTransit = $inTransitQ->count();

        $byOriginQ = Shipment::selectRaw('origin, COUNT(*) as count');
        RegionContext::apply($byOriginQ, $request);
        $byOrigin = $byOriginQ->groupBy('origin')->get();

        $byStatusQ = Shipment::join('shipment_statuses', 'shipments.status_id', '=', 'shipment_statuses.id')
            ->selectRaw('shipment_statuses.name, shipment_statuses.color, COUNT(*) as count');
        RegionContext::apply($byStatusQ, $request, 'shipments.region');
        $byStatus = $byStatusQ->groupBy('shipment_statuses.name', 'shipment_statuses.color')->get();

        if ($request->filled('export')) {
            $rows = [];
            foreach ($byStatus as $s) {
                $rows[] = ['Statut' => $s->name, 'Nombre' => $s->count];
            }
            foreach ($byOrigin as $o) {
                $rows[] = ['Origine' => $o->origin, 'Nombre' => $o->count];
            }
            if ($request->export === 'pdf') {
                $selectedRegion = $request->get('region') ?: 'Toutes les régions';

                // Recent shipments for detailed report
                $recentShipmentsQ = Shipment::with(['client:id,name,phone', 'status:id,name'])
                    ->orderByDesc('created_at')
                    ->limit(30);
                RegionContext::apply($recentShipmentsQ, $request);
                $recentShipments = $recentShipmentsQ->get();

                return $this->exportPdf('reports.shipments', compact('total', 'delivered', 'inTransit', 'byStatus', 'byOrigin', 'selectedRegion', 'recentShipments'), 'rapport-expeditions');
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
        $unpaidQ = Shipment::with('client:id,name,phone')
            ->where('balance_due', '>', 0);
        RegionContext::apply($unpaidQ, $request);
        $unpaidShipments = $unpaidQ->orderBy('balance_due', 'desc')->get();

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
                $selectedRegion = $request->get('region') ?: 'Toutes les régions';
                // Detailed unpaid shipments
                $unpaidDetails = $unpaidShipments->map(fn($s) => [
                    'tracking' => $s->tracking_number,
                    'client' => $s->client?->name ?? 'N/A',
                    'phone' => $s->client?->phone ?? '',
                    'total_cost' => (float)$s->total_cost,
                    'paid' => (float)$s->amount_paid,
                    'balance' => (float)$s->balance_due,
                    'origin' => $s->origin,
                    'date' => $s->created_at?->format('d/m/Y'),
                ])->take(50);
                return $this->exportPdf('reports.debts', compact('totalDebt', 'clientsCount', 'avgDebt', 'debtByClient', 'selectedRegion', 'unpaidDetails'), 'rapport-dettes');
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
        $totalAdvancedQ = CashAdvance::query();
        RegionContext::apply($totalAdvancedQ, $request);
        $totalAdvanced = $totalAdvancedQ->sum('amount');

        $totalRecoveredQ = CashAdvance::query();
        RegionContext::apply($totalRecoveredQ, $request);
        $totalRecovered = $totalRecoveredQ->sum('total_paid');

        $outstandingQ = CashAdvance::whereIn('status', ['pending', 'partial', 'active', 'overdue']);
        RegionContext::apply($outstandingQ, $request);
        $outstanding = $outstandingQ->sum(DB::raw('COALESCE(total_due, amount) - COALESCE(total_paid, 0)'));

        $overdueQ = CashAdvance::where(function($q) {
                $q->where('status', 'overdue')
                  ->orWhere(function($q2) {
                      $q2->whereIn('status', ['pending', 'partial', 'active'])
                         ->where('due_date', '<', now());
                  });
            });
        RegionContext::apply($overdueQ, $request);
        $overdueCount = $overdueQ->count();

        $trendQ = CashAdvance::selectRaw("DATE(created_at) as date, SUM(amount) as advanced, SUM(COALESCE(total_paid,0)) as recovered");
        RegionContext::apply($trendQ, $request);
        $trend = $trendQ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->limit(30)
            ->get();

        if ($request->filled('export')) {
            $rows = $trend->map(fn($t) => [
                'Date' => $t->date, 'Avancé' => $t->advanced, 'Récupéré' => $t->recovered,
            ])->toArray();
            array_unshift($rows, ['Date' => 'TOTAL', 'Avancé' => $totalAdvanced, 'Récupéré' => $totalRecovered]);
            if ($request->export === 'pdf') {
                $selectedRegion = $request->input('region') ?: 'Toutes les régions';
                // Recent cash advances detail
                $recentAdvancesQ = CashAdvance::with('client:id,name,phone')->orderByDesc('created_at')->limit(30);
                RegionContext::apply($recentAdvancesQ, $request);
                $recentAdvances = $recentAdvancesQ->get();
                return $this->exportPdf('reports.cash-advances', compact('totalAdvanced', 'totalRecovered', 'outstanding', 'overdueCount', 'trend', 'selectedRegion', 'recentAdvances'), 'rapport-avances');
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

    public function flightTickets(Request $request)
    {
        [$startDate, $endDate] = $this->getDateRange($request);

        $query = FlightTicket::whereNotIn('status', ['cancelled', 'refunded']);
        RegionContext::apply($query, $request);
        $periodQuery = (clone $query)->whereBetween('created_at', [$startDate, $endDate]);

        $totalSales = $periodQuery->sum('total_price');
        $totalCollected = (clone $query)->whereBetween('created_at', [$startDate, $endDate])->sum('amount_paid');
        $totalPending = (clone $query)->whereBetween('created_at', [$startDate, $endDate])->sum('balance_due');
        $ticketCount = (clone $query)->whereBetween('created_at', [$startDate, $endDate])->count();

        // By airline
        $byAirline = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('airline as name, COUNT(*) as count, SUM(total_price) as total')
            ->groupBy('airline')
            ->orderByDesc('total')
            ->limit(10);
        RegionContext::apply($byAirline, $request);
        $byAirline = $byAirline->get();

        // By route
        $byRoute = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("CONCAT(departure_airport, ' → ', arrival_airport) as name, COUNT(*) as count, SUM(total_price) as total")
            ->groupBy(DB::raw("CONCAT(departure_airport, ' → ', arrival_airport)"))
            ->orderByDesc('count')
            ->limit(10);
        RegionContext::apply($byRoute, $request);
        $byRoute = $byRoute->get();

        // Trend
        [$selectExpr, $groupExpr] = $this->getGroupByExpression($request);
        $trendSelect = sprintf($selectExpr, 'created_at', 'created_at');
        $trendGroup = sprintf($groupExpr, 'created_at');
        $trend = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("{$trendSelect}, COUNT(*) as tickets, SUM(total_price) as sales, SUM(amount_paid) as collected")
            ->groupBy(DB::raw($trendGroup))
            ->orderBy('date')
            ->limit(60);
        RegionContext::apply($trend, $request);
        $trend = $trend->get();

        // Recent tickets
        $recentTickets = FlightTicket::whereNotIn('status', ['cancelled', 'refunded'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderByDesc('created_at')
            ->limit(20);
        RegionContext::apply($recentTickets, $request);
        $recentTickets = $recentTickets->get(['id', 'ticket_number', 'passenger_name', 'airline', 'departure_airport', 'arrival_airport', 'total_price', 'amount_paid', 'balance_due', 'currency', 'status', 'created_at']);

        if ($request->filled('export')) {
            $rows = $recentTickets->map(fn($t) => [
                'N° Billet' => $t->ticket_number,
                'Passager' => $t->passenger_name,
                'Compagnie' => $t->airline,
                'Route' => $t->departure_airport . ' → ' . $t->arrival_airport,
                'Total' => $t->total_price,
                'Payé' => $t->amount_paid,
                'Solde' => $t->balance_due,
                'Statut' => $t->status,
                'Date' => $t->created_at->format('Y-m-d'),
            ])->toArray();

            if ($request->export === 'pdf') {
                $selectedRegion = $request->get('region') ?: 'Toutes les régions';
                $periodLabel = $request->filled('start_date') ? $request->start_date . ' — ' . $request->end_date : ucfirst($request->get('period', 'month'));
                return $this->exportPdf('reports.flight-tickets', compact(
                    'totalSales', 'totalCollected', 'totalPending', 'ticketCount',
                    'byAirline', 'byRoute', 'trend', 'recentTickets',
                    'selectedRegion', 'periodLabel'
                ), 'rapport-billets-avion');
            }
            return $this->exportCsv($rows, 'rapport-billets-avion');
        }

        return response()->json([
            'summary' => [
                'total_sales' => (float)$totalSales,
                'total_collected' => (float)$totalCollected,
                'total_pending' => (float)$totalPending,
                'ticket_count' => $ticketCount,
            ],
            'by_airline' => $byAirline,
            'by_route' => $byRoute,
            'trend' => $trend,
            'recent_tickets' => $recentTickets,
        ]);
    }

    public function transfers(Request $request)
    {
        [$startDate, $endDate] = $this->getDateRange($request);

        $baseQ = Transfer::whereBetween('created_at', [$startDate, $endDate]);
        RegionContext::apply($baseQ, $request);

        $totalAmount = (clone $baseQ)->sum('amount');
        $totalCount = (clone $baseQ)->count();
        $completedCount = (clone $baseQ)->where('status', 'completed')->count();
        $pendingCount = (clone $baseQ)->where('status', 'pending_approval')->count();
        $approvedCount = (clone $baseQ)->where('status', 'approved')->count();

        $byStatus = (clone $baseQ)
            ->selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('status')
            ->get();

        $byRegion = (clone $baseQ)
            ->selectRaw('destination_region as region, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('destination_region')
            ->orderByDesc('total')
            ->get();

        [$selectExpr, $groupExpr] = $this->getGroupByExpression($request);
        $trendSelect = sprintf($selectExpr, 'created_at', 'created_at');
        $trendGroup = sprintf($groupExpr, 'created_at');
        $trend = (clone $baseQ)
            ->selectRaw("{$trendSelect}, COUNT(*) as count, SUM(amount) as total")
            ->groupBy(DB::raw($trendGroup))
            ->orderBy('date')
            ->limit(60)
            ->get();

        if ($request->filled('export')) {
            $rows = $byStatus->map(fn($s) => [
                'Status' => $s->status, 'Count' => $s->count, 'Total' => $s->total,
            ])->toArray();

            if ($request->export === 'pdf') {
                $recentTransfers = (clone $baseQ)
                    ->orderByDesc('created_at')
                    ->limit(30)
                    ->get(['id', 'reference', 'transfer_code', 'client_name', 'amount', 'currency', 'origin_region', 'destination_region', 'status', 'created_at']);
                $selectedRegion = $request->get('region') ?: 'Toutes les régions';
                $periodLabel = $request->filled('start_date') ? $request->start_date . ' — ' . $request->end_date : ucfirst($request->get('period', 'month'));
                return $this->exportPdf('reports.transfers', compact(
                    'totalAmount', 'totalCount', 'completedCount', 'pendingCount', 'approvedCount',
                    'byStatus', 'byRegion', 'trend', 'recentTransfers',
                    'selectedRegion', 'periodLabel'
                ), 'rapport-transfers');
            }
            return $this->exportCsv($rows, 'rapport-transfers');
        }

        return response()->json([
            'summary' => [
                'total_amount' => (float)$totalAmount,
                'total_count' => $totalCount,
                'completed' => $completedCount,
                'pending' => $pendingCount,
                'approved' => $approvedCount,
            ],
            'by_status' => $byStatus,
            'by_region' => $byRegion,
            'trend' => $trend,
        ]);
    }

    public function containers(Request $request)
    {
        [$startDate, $endDate] = $this->getDateRange($request);

        $shipmentsQ = Shipment::whereNotNull('container_number')
            ->where('container_number', '!=', '')
            ->whereBetween('created_at', [$startDate, $endDate]);
        RegionContext::apply($shipmentsQ, $request);

        $containers = $shipmentsQ
            ->selectRaw("container_number, COUNT(*) as shipment_count, SUM(COALESCE(amount_paid,0)) as revenue, SUM(COALESCE(customs_fee,0) + COALESCE(shipping_cost,0) + COALESCE(other_fees,0)) as expenses, SUM(COALESCE(weight,0)) as total_weight, SUM(COALESCE(cbm,0)) as total_cbm, MIN(created_at) as first_shipment, MAX(created_at) as last_shipment")
            ->groupBy('container_number')
            ->orderByDesc('last_shipment')
            ->limit(50)
            ->get()
            ->map(function ($c) {
                $c->profit = $c->revenue - $c->expenses;
                $c->margin = $c->revenue > 0 ? round(($c->profit / $c->revenue) * 100, 1) : 0;
                return $c;
            });

        $totalContainers = $containers->count();
        $totalRevenue = $containers->sum('revenue');
        $totalExpenses = $containers->sum('expenses');
        $totalProfit = $totalRevenue - $totalExpenses;

        if ($request->filled('export')) {
            $rows = $containers->map(fn($c) => [
                'Container' => $c->container_number,
                'Shipments' => $c->shipment_count,
                'Revenue' => $c->revenue,
                'Expenses' => $c->expenses,
                'Profit' => $c->profit,
                'Margin %' => $c->margin,
                'Weight' => $c->total_weight,
                'CBM' => $c->total_cbm,
            ])->toArray();
            if ($request->export === 'pdf') {
                $selectedRegion = $request->get('region') ?: 'Toutes les régions';
                $periodLabel = $request->filled('start_date') ? $request->start_date . ' — ' . $request->end_date : ucfirst($request->get('period', 'month'));
                return $this->exportPdf('reports.containers', compact('containers', 'totalContainers', 'totalRevenue', 'totalExpenses', 'totalProfit', 'selectedRegion', 'periodLabel'), 'rapport-containers');
            }
            return $this->exportCsv($rows, 'rapport-containers');
        }

        return response()->json([
            'summary' => [
                'total_containers' => $totalContainers,
                'total_revenue' => (float)$totalRevenue,
                'total_expenses' => (float)$totalExpenses,
                'total_profit' => (float)$totalProfit,
            ],
            'containers' => $containers,
        ]);
    }
}
