<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Dettes</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
        .container { padding: 20px; }
        .header { margin-bottom: 16px; border-bottom: 3px solid #1E40AF; padding-bottom: 10px; }
        .title { font-size: 20px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 9px; color: #666; margin-top: 3px; }
        .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .kpi-table td { padding: 10px 8px; text-align: center; }
        .kpi-table .label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: bold; }
        .kpi-table .value { font-size: 20px; font-weight: bold; margin-top: 3px; }
        .red { color: #DC2626; }
        .green { color: #059669; }
        .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; margin: 14px 0 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .data-table th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; }
        .data-table td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 9px; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .data-table .total-row { background: #e0e7ff; font-weight: bold; }
        .text-right { text-align: right; }
        .page-break { page-break-before: always; }
        .footer { margin-top: 16px; padding-top: 6px; border-top: 2px solid #1E40AF; font-size: 8px; color: #999; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="title">TNT Cargo — Rapport Dettes</div>
        <div class="subtitle">Région: {{ $selectedRegion ?? 'Toutes les régions' }} | Généré le {{ now()->format('d/m/Y H:i') }}</div>
    </div>

    {{-- KPIs --}}
    <table class="kpi-table">
        <tr>
            <td><div class="label">Dette Totale</div><div class="value red">${{ number_format($totalDebt, 2, ',', ' ') }}</div></td>
            <td><div class="label">Clients Endettés</div><div class="value">{{ $clientsCount }}</div></td>
            <td><div class="label">Moyenne par Client</div><div class="value">${{ number_format($avgDebt, 2, ',', ' ') }}</div></td>
        </tr>
    </table>

    {{-- Summary by Client --}}
    <div class="section-title">Résumé par Client</div>
    <table class="data-table">
        <thead><tr><th>#</th><th>Client</th><th>Téléphone</th><th class="text-right">Expéditions</th><th class="text-right">Dette</th><th class="text-right">% du Total</th></tr></thead>
        <tbody>
        @foreach($debtByClient as $i => $d)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td><strong>{{ $d['name'] }}</strong></td>
                <td>{{ $d['phone'] }}</td>
                <td class="text-right">{{ $d['shipment_count'] }}</td>
                <td class="text-right red">${{ number_format($d['total_debt'], 2, ',', ' ') }}</td>
                <td class="text-right">{{ $totalDebt > 0 ? round(($d['total_debt'] / $totalDebt) * 100, 1) : 0 }}%</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td colspan="4" class="text-right">TOTAL</td>
            <td class="text-right">${{ number_format($totalDebt, 2, ',', ' ') }}</td>
            <td class="text-right">100%</td>
        </tr>
        </tbody>
    </table>

    {{-- Detailed unpaid shipments --}}
    @if(!empty($unpaidDetails) && count($unpaidDetails) > 0)
    <div class="section-title">Détail des Expéditions Impayées ({{ count($unpaidDetails) }})</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>N° Suivi</th>
                <th>Client</th>
                <th>Tél.</th>
                <th>Origine</th>
                <th class="text-right">Coût Total</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Solde Dû</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
        @php $totCost = 0; $totPaid = 0; $totBal = 0; @endphp
        @foreach($unpaidDetails as $i => $u)
            @php $totCost += $u['total_cost']; $totPaid += $u['paid']; $totBal += $u['balance']; @endphp
            <tr>
                <td>{{ $i + 1 }}</td>
                <td style="font-family: monospace;">{{ $u['tracking'] }}</td>
                <td>{{ $u['client'] }}</td>
                <td>{{ $u['phone'] }}</td>
                <td>{{ ucfirst($u['origin'] ?? '-') }}</td>
                <td class="text-right">${{ number_format($u['total_cost'], 2, ',', ' ') }}</td>
                <td class="text-right green">${{ number_format($u['paid'], 2, ',', ' ') }}</td>
                <td class="text-right red">${{ number_format($u['balance'], 2, ',', ' ') }}</td>
                <td>{{ $u['date'] ?? '-' }}</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td colspan="5" class="text-right">TOTAUX</td>
            <td class="text-right">${{ number_format($totCost, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totPaid, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totBal, 2, ',', ' ') }}</td>
            <td></td>
        </tr>
        </tbody>
    </table>
    @endif

    <div class="footer">TNT Cargo — Rapport Dettes Confidentiel | {{ $selectedRegion ?? 'Toutes les régions' }} | Généré le {{ now()->format('d/m/Y H:i') }}</div>
</div>
</body>
</html>
