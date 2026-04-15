<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Billets d'Avion</title>
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
        .text-right { text-align: right; }
        .two-col { width: 100%; }
        .two-col td { width: 50%; vertical-align: top; padding: 0 8px 0 0; }
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
                    <div class="title">TNT Cargo — Rapport Billets d'Avion</div>
                    <div class="subtitle">Analyse des ventes de billets et encaissements</div>
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
            <td><div class="label">Billets Vendus</div><div class="value blue">{{ $ticketCount }}</div></td>
            <td><div class="label">Ventes Totales</div><div class="value green">${{ number_format($totalSales, 2, ',', ' ') }}</div></td>
            <td><div class="label">Montant Encaissé</div><div class="value blue">${{ number_format($totalCollected, 2, ',', ' ') }}</div></td>
            <td><div class="label">Solde en Attente</div><div class="value red">${{ number_format($totalPending, 2, ',', ' ') }}</div></td>
        </tr>
    </table>

    {{-- Two-column breakdowns --}}
    <table class="two-col">
        <tr>
            <td>
                <div class="section-title">Top Compagnies Aériennes</div>
                <table class="data-table">
                    <thead><tr><th>Compagnie</th><th class="text-right">Billets</th><th class="text-right">Montant</th></tr></thead>
                    <tbody>
                    @foreach($byAirline as $a)
                        <tr><td>{{ $a->name }}</td><td class="text-right">{{ $a->count }}</td><td class="text-right green">${{ number_format($a->total, 2, ',', ' ') }}</td></tr>
                    @endforeach
                    </tbody>
                </table>
            </td>
            <td>
                <div class="section-title">Top Routes</div>
                <table class="data-table">
                    <thead><tr><th>Route</th><th class="text-right">Billets</th><th class="text-right">Montant</th></tr></thead>
                    <tbody>
                    @foreach($byRoute as $r)
                        <tr><td>{{ $r->name }}</td><td class="text-right">{{ $r->count }}</td><td class="text-right green">${{ number_format($r->total, 2, ',', ' ') }}</td></tr>
                    @endforeach
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    {{-- Trend --}}
    @if(count($trend) > 0)
    <div class="section-title">Tendance des Ventes</div>
    <table class="data-table">
        <thead><tr><th>Date</th><th class="text-right">Billets</th><th class="text-right">Ventes</th><th class="text-right">Encaissé</th><th class="text-right">Solde</th></tr></thead>
        <tbody>
        @foreach($trend as $t)
            <tr>
                <td>{{ $t->date }}</td>
                <td class="text-right">{{ $t->tickets }}</td>
                <td class="text-right green">${{ number_format($t->sales, 2, ',', ' ') }}</td>
                <td class="text-right blue">${{ number_format($t->collected, 2, ',', ' ') }}</td>
                <td class="text-right red">${{ number_format($t->sales - $t->collected, 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    {{-- Recent tickets --}}
    @if(count($recentTickets) > 0)
    <div class="section-title">Derniers Billets ({{ count($recentTickets) }})</div>
    <table class="data-table">
        <thead><tr><th>N° Billet</th><th>Passager</th><th>Compagnie</th><th>Route</th><th class="text-right">Total</th><th class="text-right">Payé</th><th class="text-right">Solde</th><th>Statut</th></tr></thead>
        <tbody>
        @foreach($recentTickets as $t)
            <tr>
                <td>{{ $t->ticket_number }}</td>
                <td>{{ $t->passenger_name }}</td>
                <td>{{ $t->airline }}</td>
                <td>{{ $t->departure_airport }} → {{ $t->arrival_airport }}</td>
                <td class="text-right">${{ number_format($t->total_price, 2, ',', ' ') }}</td>
                <td class="text-right green">${{ number_format($t->amount_paid, 2, ',', ' ') }}</td>
                <td class="text-right {{ $t->balance_due > 0 ? 'red' : '' }}">${{ number_format($t->balance_due, 2, ',', ' ') }}</td>
                <td>{{ strtoupper($t->status) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <div class="footer">
        <div class="footer-brand">TNT Cargo — Rapport Billets d'Avion Confidentiel</div>
        <div>{{ $selectedRegion }} | {{ $periodLabel }} | Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
