<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Transferts</title>
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
        .yellow { color: #CA8A04; }
        .indigo { color: #4F46E5; }
        .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; margin: 14px 0 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .data-table th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
        .data-table td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .data-table .total-row { background: #e0e7ff; font-weight: bold; }
        .text-right { text-align: right; }
        .two-col { width: 100%; }
        .two-col > tbody > tr > td { width: 50%; vertical-align: top; padding: 0 8px 0 0; }
        .status-pending_approval { color: #CA8A04; }
        .status-approved { color: #2563EB; }
        .status-completed { color: #059669; }
        .status-rejected { color: #DC2626; }
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
                    <div class="title">TNT Cargo — Rapport Transferts</div>
                    <div class="subtitle">Analyse du service de transfert (Procurement)</div>
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
            <td><div class="label">Montant Total</div><div class="value green">${{ number_format($totalAmount, 2, ',', ' ') }}</div></td>
            <td><div class="label">Total Transferts</div><div class="value blue">{{ $totalCount }}</div></td>
            <td><div class="label">Complétés</div><div class="value green">{{ $completedCount }}</div></td>
            <td><div class="label">En Attente</div><div class="value yellow">{{ $pendingCount }}</div></td>
            <td><div class="label">Approuvés</div><div class="value indigo">{{ $approvedCount }}</div></td>
        </tr>
    </table>

    {{-- Two-column breakdowns --}}
    <table class="two-col">
        <tr>
            <td>
                <div class="section-title">Par Statut</div>
                <table class="data-table">
                    <thead><tr><th>Statut</th><th class="text-right">Nombre</th><th class="text-right">Montant</th></tr></thead>
                    <tbody>
                    @foreach($byStatus as $s)
                        <tr>
                            <td class="status-{{ $s->status }}"><strong>{{ strtoupper(str_replace('_', ' ', $s->status)) }}</strong></td>
                            <td class="text-right">{{ $s->count }}</td>
                            <td class="text-right">${{ number_format($s->total, 2, ',', ' ') }}</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            </td>
            <td>
                <div class="section-title">Par Région de Destination</div>
                <table class="data-table">
                    <thead><tr><th>Région</th><th class="text-right">Nombre</th><th class="text-right">Montant</th></tr></thead>
                    <tbody>
                    @foreach($byRegion as $r)
                        <tr>
                            <td><strong>{{ $r->region }}</strong></td>
                            <td class="text-right">{{ $r->count }}</td>
                            <td class="text-right green">${{ number_format($r->total, 2, ',', ' ') }}</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    {{-- Trend --}}
    @if(count($trend) > 0)
    <div class="section-title">Tendance des Transferts</div>
    <table class="data-table">
        <thead><tr><th>Date</th><th class="text-right">Nombre</th><th class="text-right">Montant Total</th></tr></thead>
        <tbody>
        @php $trendTotal = 0; $trendCount = 0; @endphp
        @foreach($trend as $t)
            @php $trendTotal += $t->total; $trendCount += $t->count; @endphp
            <tr>
                <td>{{ $t->date }}</td>
                <td class="text-right">{{ $t->count }}</td>
                <td class="text-right green">${{ number_format($t->total, 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td>TOTAL</td>
            <td class="text-right">{{ $trendCount }}</td>
            <td class="text-right">${{ number_format($trendTotal, 2, ',', ' ') }}</td>
        </tr>
        </tbody>
    </table>
    @endif

    {{-- Recent transfers --}}
    @if(count($recentTransfers) > 0)
    <div class="section-title">Derniers Transferts ({{ count($recentTransfers) }})</div>
    <table class="data-table">
        <thead><tr><th>Référence</th><th>Code</th><th>Client</th><th>De</th><th>Vers</th><th class="text-right">Montant</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>
        @foreach($recentTransfers as $tr)
            <tr>
                <td>{{ $tr->reference }}</td>
                <td>{{ $tr->transfer_code }}</td>
                <td>{{ $tr->client_name }}</td>
                <td>{{ $tr->origin_region }}</td>
                <td>{{ $tr->destination_region }}</td>
                <td class="text-right green">${{ number_format($tr->amount, 2, ',', ' ') }}</td>
                <td class="status-{{ $tr->status }}">{{ strtoupper(str_replace('_', ' ', $tr->status)) }}</td>
                <td>{{ $tr->created_at->format('d/m/Y') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <div class="footer">
        <div class="footer-brand">TNT Cargo — Rapport Transferts Confidentiel</div>
        <div>{{ $selectedRegion }} | {{ $periodLabel }} | Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
