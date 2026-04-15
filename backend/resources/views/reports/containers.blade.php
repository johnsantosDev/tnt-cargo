<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Containers</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #333; }
        .container { padding: 24px; }
        .header { margin-bottom: 16px; border-bottom: 3px solid #1E40AF; padding-bottom: 12px; }
        .header table { width: 100%; }
        .title { font-size: 22px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 10px; color: #666; margin-top: 4px; }
        .meta-box { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 8px 14px; margin-bottom: 14px; font-size: 10px; }
        .meta-label { color: #555; font-weight: bold; }
        .meta-value { color: #1E40AF; font-weight: 600; margin-right: 20px; }
        .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .summary-table td { padding: 10px 12px; text-align: center; }
        .summary-table .label { font-size: 9px; text-transform: uppercase; color: #666; font-weight: bold; }
        .summary-table .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
        .green { color: #059669; }
        .red { color: #DC2626; }
        .blue { color: #2563EB; }
        .purple { color: #7C3AED; }
        .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; margin: 14px 0 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .data-table th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
        .data-table td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .data-table .total-row { background: #e0e7ff; font-weight: bold; }
        .text-right { text-align: right; }
        .footer { margin-top: 20px; padding-top: 8px; border-top: 2px solid #1E40AF; font-size: 9px; color: #999; text-align: center; }
        .footer-brand { font-size: 11px; font-weight: bold; color: #1E40AF; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <table>
            <tr>
                <td style="width: 60%; vertical-align: middle;">
                    <div class="title">TNT Cargo — Rapport Containers</div>
                    <div class="subtitle">Analyse de rentabilité par container</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 10px; color: #666;">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="meta-box">
        <span class="meta-label">Période:</span> <span class="meta-value">{{ $periodLabel }}</span>
        <span class="meta-label">Région:</span> <span class="meta-value">{{ $selectedRegion }}</span>
    </div>

    {{-- KPIs --}}
    <table class="summary-table">
        <tr>
            <td><div class="label">Containers</div><div class="value blue">{{ $totalContainers }}</div></td>
            <td><div class="label">Revenus Totaux</div><div class="value green">${{ number_format($totalRevenue, 2, ',', ' ') }}</div></td>
            <td><div class="label">Dépenses Totales</div><div class="value red">${{ number_format($totalExpenses, 2, ',', ' ') }}</div></td>
            <td><div class="label">Bénéfice Net</div><div class="value {{ $totalProfit >= 0 ? 'blue' : 'red' }}">${{ number_format($totalProfit, 2, ',', ' ') }}</div></td>
            <td><div class="label">Marge Globale</div><div class="value purple">{{ $totalRevenue > 0 ? round(($totalProfit / $totalRevenue) * 100, 1) : 0 }}%</div></td>
        </tr>
    </table>

    {{-- Containers table --}}
    <div class="section-title">Détail par Container</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>N° Container</th>
                <th class="text-right">Expéditions</th>
                <th class="text-right">Revenus</th>
                <th class="text-right">Dépenses</th>
                <th class="text-right">Bénéfice</th>
                <th class="text-right">Marge</th>
                <th class="text-right">Poids (kg)</th>
                <th class="text-right">CBM</th>
                <th>Première</th>
                <th>Dernière</th>
            </tr>
        </thead>
        <tbody>
        @foreach($containers as $c)
            <tr>
                <td><strong>{{ $c->container_number }}</strong></td>
                <td class="text-right">{{ $c->shipment_count }}</td>
                <td class="text-right green">${{ number_format($c->revenue, 2, ',', ' ') }}</td>
                <td class="text-right red">${{ number_format($c->expenses, 2, ',', ' ') }}</td>
                <td class="text-right {{ $c->profit >= 0 ? 'blue' : 'red' }}">${{ number_format($c->profit, 2, ',', ' ') }}</td>
                <td class="text-right">{{ $c->margin }}%</td>
                <td class="text-right">{{ number_format($c->total_weight, 2) }}</td>
                <td class="text-right">{{ number_format($c->total_cbm, 4) }}</td>
                <td>{{ \Carbon\Carbon::parse($c->first_shipment)->format('d/m/Y') }}</td>
                <td>{{ \Carbon\Carbon::parse($c->last_shipment)->format('d/m/Y') }}</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td>TOTAL ({{ $totalContainers }})</td>
            <td class="text-right">{{ $containers->sum('shipment_count') }}</td>
            <td class="text-right">${{ number_format($totalRevenue, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totalExpenses, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totalProfit, 2, ',', ' ') }}</td>
            <td class="text-right">{{ $totalRevenue > 0 ? round(($totalProfit / $totalRevenue) * 100, 1) : 0 }}%</td>
            <td class="text-right">{{ number_format($containers->sum('total_weight'), 2) }}</td>
            <td class="text-right">{{ number_format($containers->sum('total_cbm'), 4) }}</td>
            <td colspan="2"></td>
        </tr>
        </tbody>
    </table>

    <div class="footer">
        <div class="footer-brand">TNT Cargo — Rapport Containers Confidentiel</div>
        <div>{{ $selectedRegion }} | {{ $periodLabel }} | Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
