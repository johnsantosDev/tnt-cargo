<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Cash Advance</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
        .container { padding: 20px; }
        .header { margin-bottom: 16px; border-bottom: 3px solid #1E40AF; padding-bottom: 10px; }
        .title { font-size: 20px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 9px; color: #666; margin-top: 3px; }
        .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .kpi-table td { padding: 10px 8px; text-align: center; width: 25%; }
        .kpi-table .label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: bold; }
        .kpi-table .value { font-size: 18px; font-weight: bold; margin-top: 3px; }
        .green { color: #059669; }
        .red { color: #DC2626; }
        .amber { color: #D97706; }
        .blue { color: #2563EB; }
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
        <div class="title">TNT Cargo — Rapport Cash Advance</div>
        <div class="subtitle">Région: {{ $selectedRegion ?? 'Toutes les régions' }} | Généré le {{ now()->format('d/m/Y H:i') }}</div>
    </div>

    {{-- KPIs --}}
    <table class="kpi-table">
        <tr>
            <td><div class="label">Total Avancé</div><div class="value blue">${{ number_format($totalAdvanced, 2, ',', ' ') }}</div></td>
            <td><div class="label">Total Récupéré</div><div class="value green">${{ number_format($totalRecovered, 2, ',', ' ') }}</div></td>
            <td><div class="label">Encours</div><div class="value red">${{ number_format($outstanding, 2, ',', ' ') }}</div></td>
            <td><div class="label">En Retard</div><div class="value amber">{{ $overdueCount }}</div></td>
        </tr>
    </table>

    {{-- Trend --}}
    @if($trend->count() > 0)
    <div class="section-title">Tendance Journalière</div>
    <table class="data-table">
        <thead><tr><th>Date</th><th class="text-right">Avancé</th><th class="text-right">Récupéré</th><th class="text-right">Solde Net</th></tr></thead>
        <tbody>
        @php $totAdv = 0; $totRec = 0; @endphp
        @foreach($trend as $row)
            @php $totAdv += $row->advanced; $totRec += $row->recovered; @endphp
            <tr>
                <td>{{ $row->date }}</td>
                <td class="text-right">${{ number_format($row->advanced, 2, ',', ' ') }}</td>
                <td class="text-right green">${{ number_format($row->recovered, 2, ',', ' ') }}</td>
                <td class="text-right {{ ($row->advanced - $row->recovered) > 0 ? 'red' : 'green' }}">${{ number_format($row->advanced - $row->recovered, 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td>TOTAL</td>
            <td class="text-right">${{ number_format($totAdv, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totRec, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($totAdv - $totRec, 2, ',', ' ') }}</td>
        </tr>
        </tbody>
    </table>
    @endif

    {{-- Recent cash advances detail --}}
    @if(!empty($recentAdvances) && count($recentAdvances) > 0)
    <div class="section-title">Dernières Avances ({{ count($recentAdvances) }})</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Bénéficiaire</th>
                <th>Motif</th>
                <th>Région</th>
                <th>Statut</th>
                <th class="text-right">Montant</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Solde</th>
                <th>Échéance</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
        @php $sumAmt = 0; $sumPaid = 0; @endphp
        @foreach($recentAdvances as $i => $ca)
            @php
                $sumAmt += $ca->amount;
                $sumPaid += $ca->total_paid;
                $balance = ($ca->total_due ?? $ca->amount) - ($ca->total_paid ?? 0);
                $isOverdue = in_array($ca->status, ['overdue']) || (in_array($ca->status, ['pending','partial','active']) && $ca->due_date && $ca->due_date < now());
            @endphp
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $ca->client?->name ?? $ca->reference ?? '-' }}</td>
                <td>{{ \Illuminate\Support\Str::limit($ca->notes ?? '-', 30) }}</td>
                <td>{{ $ca->region ?? '-' }}</td>
                <td style="{{ $isOverdue ? 'color:#DC2626;font-weight:bold;' : '' }}">{{ ucfirst($ca->status ?? '-') }}</td>
                <td class="text-right">${{ number_format($ca->amount, 2, ',', ' ') }}</td>
                <td class="text-right green">${{ number_format($ca->total_paid ?? 0, 2, ',', ' ') }}</td>
                <td class="text-right {{ $balance > 0 ? 'red' : 'green' }}">${{ number_format($balance, 2, ',', ' ') }}</td>
                <td>{{ $ca->due_date ? \Carbon\Carbon::parse($ca->due_date)->format('d/m/Y') : '-' }}</td>
                <td>{{ $ca->created_at?->format('d/m/Y') }}</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td colspan="5" class="text-right">TOTAUX</td>
            <td class="text-right">${{ number_format($sumAmt, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($sumPaid, 2, ',', ' ') }}</td>
            <td class="text-right">${{ number_format($sumAmt - $sumPaid, 2, ',', ' ') }}</td>
            <td colspan="2"></td>
        </tr>
        </tbody>
    </table>
    @endif

    <div class="footer">TNT Cargo — Rapport Cash Advance Confidentiel | {{ $selectedRegion ?? 'Toutes les régions' }} | Généré le {{ now()->format('d/m/Y H:i') }}</div>
</div>
</body>
</html>
