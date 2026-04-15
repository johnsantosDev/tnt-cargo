<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Expéditions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
        .container { padding: 20px; }
        .header { margin-bottom: 16px; border-bottom: 3px solid #1E40AF; padding-bottom: 10px; }
        .title { font-size: 20px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 9px; color: #666; margin-top: 3px; }
        .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .kpi-table td { padding: 10px 8px; text-align: center; width: 33%; }
        .kpi-table .label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: bold; }
        .kpi-table .value { font-size: 20px; font-weight: bold; margin-top: 3px; }
        .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; margin: 14px 0 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .data-table th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; }
        .data-table td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 9px; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .text-right { text-align: right; }
        .green { color: #059669; }
        .red { color: #DC2626; }
        .blue { color: #2563EB; }
        .two-col { width: 100%; }
        .two-col td { vertical-align: top; width: 50%; padding: 0 6px; }
        .two-col td:first-child { padding-left: 0; }
        .two-col td:last-child { padding-right: 0; }
        .page-break { page-break-before: always; }
        .footer { margin-top: 20px; padding-top: 8px; border-top: 2px solid #1E40AF; font-size: 8px; color: #999; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="title">TNT Cargo — Rapport Expéditions</div>
        <div class="subtitle">Région: {{ $selectedRegion ?? 'Toutes les régions' }} | Généré le {{ now()->format('d/m/Y H:i') }}</div>
    </div>

    {{-- KPIs --}}
    <table class="kpi-table">
        <tr>
            <td><div class="label">Total Expéditions</div><div class="value">{{ $total }}</div></td>
            <td><div class="label">Livrées</div><div class="value green">{{ $delivered }}</div></td>
            <td><div class="label">En Transit</div><div class="value blue">{{ $inTransit }}</div></td>
        </tr>
    </table>

    {{-- Status + Origin side by side --}}
    <table class="two-col">
        <tr>
            <td>
                <div class="section-title">Par Statut</div>
                <table class="data-table">
                    <thead><tr><th>Statut</th><th class="text-right">Nombre</th><th class="text-right">%</th></tr></thead>
                    <tbody>
                    @foreach($byStatus as $s)
                        <tr>
                            <td>{{ $s->name }}</td>
                            <td class="text-right">{{ $s->count }}</td>
                            <td class="text-right">{{ $total > 0 ? round(($s->count / $total) * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            </td>
            <td>
                <div class="section-title">Par Origine</div>
                <table class="data-table">
                    <thead><tr><th>Origine</th><th class="text-right">Nombre</th><th class="text-right">%</th></tr></thead>
                    <tbody>
                    @foreach($byOrigin as $o)
                        <tr>
                            <td>{{ ucfirst($o->origin) }}</td>
                            <td class="text-right">{{ $o->count }}</td>
                            <td class="text-right">{{ $total > 0 ? round(($o->count / $total) * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    {{-- Recent Shipments Detail --}}
    @if(!empty($recentShipments) && count($recentShipments) > 0)
    <div class="section-title">Dernières Expéditions ({{ count($recentShipments) }})</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>N° Suivi</th>
                <th>Client</th>
                <th>Tél.</th>
                <th>Origine</th>
                <th>Destination</th>
                <th>Statut</th>
                <th class="text-right">Poids</th>
                <th class="text-right">Coût Total</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Solde</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
        @php $totCost = 0; $totPaid = 0; $totBal = 0; @endphp
        @foreach($recentShipments as $i => $s)
            @php $totCost += $s->total_cost; $totPaid += $s->amount_paid; $totBal += $s->balance_due; @endphp
            <tr>
                <td>{{ $i + 1 }}</td>
                <td style="font-family: monospace;">{{ $s->tracking_number }}</td>
                <td>{{ $s->client?->name ?? '-' }}</td>
                <td>{{ $s->client?->phone ?? '-' }}</td>
                <td>{{ ucfirst($s->origin ?? '-') }}</td>
                <td>{{ $s->destination ?? '-' }}</td>
                <td>{{ $s->status?->name ?? '-' }}</td>
                <td class="text-right">{{ $s->weight ? number_format($s->weight, 1) . ' kg' : '-' }}</td>
                <td class="text-right">${{ number_format($s->total_cost ?? 0, 2, ',', ' ') }}</td>
                <td class="text-right green">${{ number_format($s->amount_paid ?? 0, 2, ',', ' ') }}</td>
                <td class="text-right {{ $s->balance_due > 0 ? 'red' : 'green' }}">${{ number_format($s->balance_due ?? 0, 2, ',', ' ') }}</td>
                <td>{{ $s->created_at?->format('d/m/Y') }}</td>
            </tr>
        @endforeach
        <tr style="background: #e0e7ff; font-weight: bold;">
            <td colspan="8" class="text-right">TOTAUX</td>
            <td class="text-right">${{ number_format($totCost, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totPaid, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totBal, 2, ',', ' ') }}</td>
            <td></td>
        </tr>
        </tbody>
    </table>
    @endif

    <div class="footer">TNT Cargo — Rapport Expéditions Confidentiel | {{ $selectedRegion ?? 'Toutes les régions' }} | Généré le {{ now()->format('d/m/Y H:i') }}</div>
</div>
</body>
</html>
