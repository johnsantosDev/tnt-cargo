<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Financier</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
        .container { padding: 20px; }
        .header { margin-bottom: 16px; border-bottom: 3px solid #1E40AF; padding-bottom: 10px; }
        .header table { width: 100%; }
        .title { font-size: 20px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 9px; color: #666; margin-top: 3px; }
        .meta-box { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 6px 12px; margin-bottom: 14px; font-size: 9px; }
        .meta-box span { margin-right: 18px; }
        .meta-label { color: #555; font-weight: bold; }
        .meta-value { color: #1E40AF; font-weight: 600; }
        .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .kpi-table td { padding: 10px 8px; text-align: center; }
        .kpi-table .label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: bold; }
        .kpi-table .value { font-size: 18px; font-weight: bold; margin-top: 3px; }
        .green { color: #059669; }
        .red { color: #DC2626; }
        .blue { color: #2563EB; }
        .purple { color: #7C3AED; }
        .indigo { color: #4F46E5; }
        .amber { color: #D97706; }
        .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; margin: 14px 0 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .data-table th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; }
        .data-table td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 9px; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .data-table .total-row { background: #e0e7ff; font-weight: bold; }
        .text-right { text-align: right; }
        .two-col { width: 100%; }
        .two-col td { vertical-align: top; width: 50%; padding: 0 6px; }
        .two-col td:first-child { padding-left: 0; }
        .two-col td:last-child { padding-right: 0; }
        .footer { margin-top: 16px; padding-top: 6px; border-top: 2px solid #1E40AF; font-size: 8px; color: #999; text-align: center; }
        .footer-brand { font-size: 10px; font-weight: bold; color: #1E40AF; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <table>
            <tr>
                <td style="width: 60%; vertical-align: middle;">
                    <div class="title">TNT Cargo — Rapport Financier</div>
                    <div class="subtitle">Rapport détaillé des revenus, dépenses et bénéfices</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 9px; color: #666;">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="meta-box">
        <span><span class="meta-label">Période:</span> <span class="meta-value">{{ $periodLabel ?? '-' }}</span></span>
        <span><span class="meta-label">Région:</span> <span class="meta-value">{{ $selectedRegion ?? 'Toutes les régions' }}</span></span>
    </div>

    {{-- Summary KPIs --}}
    <table class="kpi-table">
        <tr>
            <td><div class="label">Revenus Totaux</div><div class="value green">${{ number_format($displayRevenue, 2, ',', ' ') }}</div></td>
            <td><div class="label">Dépenses Totales</div><div class="value red">${{ number_format($displayExpenses, 2, ',', ' ') }}</div></td>
            <td><div class="label">Bénéfice Net</div><div class="value blue">${{ number_format($netProfit, 2, ',', ' ') }}</div></td>
            <td><div class="label">Marge</div><div class="value purple">{{ $margin }}%</div></td>
            <td><div class="label">Revenus Billets</div><div class="value indigo">${{ number_format($displayFlightRevenue ?? 0, 2, ',', ' ') }}</div></td>
        </tr>
    </table>

    {{-- Region breakdown --}}
    @if(!empty($regionBreakdown))
    <div class="section-title">Répartition par Région</div>
    <table class="data-table">
        <thead>
            <tr><th>Région</th><th class="text-right">Revenus</th><th class="text-right">Dépenses</th><th class="text-right">Bénéfice</th><th class="text-right">Marge</th></tr>
        </thead>
        <tbody>
        @php $grandRev = 0; $grandExp = 0; @endphp
        @foreach($regionBreakdown as $rb)
            @php $grandRev += $rb['revenue']; $grandExp += $rb['expenses']; @endphp
            <tr>
                <td><strong>{{ $rb['region'] }}</strong></td>
                <td class="text-right green">${{ number_format($rb['revenue'], 2, ',', ' ') }}</td>
                <td class="text-right red">${{ number_format($rb['expenses'], 2, ',', ' ') }}</td>
                <td class="text-right {{ $rb['profit'] >= 0 ? 'blue' : 'red' }}">${{ number_format($rb['profit'], 2, ',', ' ') }}</td>
                <td class="text-right">{{ $rb['revenue'] > 0 ? round(($rb['profit'] / $rb['revenue']) * 100, 1) : 0 }}%</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td>TOTAL</td>
            <td class="text-right">${{ number_format($grandRev, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($grandExp, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($grandRev - $grandExp, 2, ',', ' ') }}</td>
            <td class="text-right">{{ $grandRev > 0 ? round((($grandRev - $grandExp) / $grandRev) * 100, 1) : 0 }}%</td>
        </tr>
        </tbody>
    </table>
    @endif

    {{-- Top Clients + Expense Categories side by side --}}
    <table class="two-col">
        <tr>
            <td>
                @if(!empty($topClients) && count($topClients) > 0)
                <div class="section-title">Top 10 Clients (Revenus)</div>
                <table class="data-table">
                    <thead><tr><th>#</th><th>Client</th><th>Tél.</th><th class="text-right">Paiements</th><th class="text-right">Total</th></tr></thead>
                    <tbody>
                    @foreach($topClients as $i => $c)
                        <tr>
                            <td>{{ $i + 1 }}</td>
                            <td>{{ $c->name }}</td>
                            <td>{{ $c->phone }}</td>
                            <td class="text-right">{{ $c->payment_count }}</td>
                            <td class="text-right green">${{ number_format($c->total, 2, ',', ' ') }}</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
                @endif
            </td>
            <td>
                @if(!empty($expenseCategories) && count($expenseCategories) > 0)
                <div class="section-title">Dépenses par Catégorie</div>
                <table class="data-table">
                    <thead><tr><th>Catégorie</th><th class="text-right">Nombre</th><th class="text-right">Montant</th><th class="text-right">% Total</th></tr></thead>
                    <tbody>
                    @foreach($expenseCategories as $ec)
                        <tr>
                            <td>{{ ucfirst($ec->category ?: 'Non catégorisé') }}</td>
                            <td class="text-right">{{ $ec->count }}</td>
                            <td class="text-right red">${{ number_format($ec->total, 2, ',', ' ') }}</td>
                            <td class="text-right">{{ $displayExpenses > 0 ? round(($ec->total / $displayExpenses) * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
                @endif
            </td>
        </tr>
    </table>

    {{-- Period detail --}}
    @if(count($chartData) > 0)
    <div class="section-title">Détail par Période</div>
    <table class="data-table">
        <thead><tr><th>Date</th><th class="text-right">Revenus</th><th class="text-right">Dépenses</th><th class="text-right">Profit</th><th class="text-right">Marge</th></tr></thead>
        <tbody>
        @php $totRev = 0; $totExp = 0; @endphp
        @foreach($chartData as $row)
            @php $totRev += $row['revenue']; $totExp += $row['expenses']; $profit = $row['revenue'] - $row['expenses']; @endphp
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="text-right green">${{ number_format($row['revenue'], 2, ',', ' ') }}</td>
                <td class="text-right red">${{ number_format($row['expenses'], 2, ',', ' ') }}</td>
                <td class="text-right {{ $profit >= 0 ? 'blue' : 'red' }}">${{ number_format($profit, 2, ',', ' ') }}</td>
                <td class="text-right">{{ $row['revenue'] > 0 ? round(($profit / $row['revenue']) * 100, 1) : 0 }}%</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td>TOTAL</td>
            <td class="text-right">${{ number_format($totRev, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totExp, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totRev - $totExp, 2, ',', ' ') }}</td>
            <td class="text-right">{{ $totRev > 0 ? round((($totRev - $totExp) / $totRev) * 100, 1) : 0 }}%</td>
        </tr>
        </tbody>
    </table>
    @endif

    {{-- Recent Payments --}}
    @if(!empty($recentPayments) && count($recentPayments) > 0)
    <div class="page-break"></div>
    <div class="section-title">Derniers Paiements Reçus ({{ count($recentPayments) }})</div>
    <table class="data-table">
        <thead><tr><th>#</th><th>Date</th><th>Client</th><th>Expédition</th><th>Méthode</th><th class="text-right">Montant</th></tr></thead>
        <tbody>
        @foreach($recentPayments as $i => $p)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $p->payment_date ? \Carbon\Carbon::parse($p->payment_date)->format('d/m/Y') : '-' }}</td>
                <td>{{ $p->shipment?->client?->name ?? '-' }}</td>
                <td>{{ $p->shipment?->tracking_number ?? '-' }}</td>
                <td>{{ ucfirst($p->method ?? '-') }}</td>
                <td class="text-right green">${{ number_format($p->amount, 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    {{-- Recent Expenses --}}
    @if(!empty($recentExpenses) && count($recentExpenses) > 0)
    <div class="section-title">Dernières Dépenses ({{ count($recentExpenses) }})</div>
    <table class="data-table">
        <thead><tr><th>#</th><th>Date</th><th>Catégorie</th><th>Description</th><th>Région</th><th class="text-right">Montant</th></tr></thead>
        <tbody>
        @foreach($recentExpenses as $i => $e)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $e->expense_date ? \Carbon\Carbon::parse($e->expense_date)->format('d/m/Y') : '-' }}</td>
                <td>{{ ucfirst($e->category ?? '-') }}</td>
                <td>{{ \Illuminate\Support\Str::limit($e->description ?? '-', 40) }}</td>
                <td>{{ $e->region ?? '-' }}</td>
                <td class="text-right red">${{ number_format($e->amount, 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <div class="footer">
        <div class="footer-brand">TNT Cargo — Rapport Financier Confidentiel</div>
        <div>{{ $selectedRegion ?? 'Toutes les régions' }} | {{ $periodLabel ?? '' }} | Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
