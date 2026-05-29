<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Container {{ $containerCode }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
        .container { padding: 20px; }
        .header { margin-bottom: 14px; border-bottom: 3px solid #1E40AF; padding-bottom: 10px; }
        .header table { width: 100%; }
        .title { font-size: 20px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 10px; color: #666; margin-top: 3px; }
        .meta-box { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 6px 12px; margin-bottom: 12px; font-size: 10px; }
        .meta-label { color: #555; font-weight: bold; }
        .meta-value { color: #1E40AF; font-weight: 600; margin-right: 18px; }
        .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .summary-table td { padding: 8px 10px; text-align: center; border: 1px solid #e0e7ff; }
        .summary-table .label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: bold; }
        .summary-table .value { font-size: 14px; font-weight: bold; margin-top: 3px; }
        .green { color: #059669; }
        .red { color: #DC2626; }
        .blue { color: #2563EB; }
        .amber { color: #B45309; }
        .gray { color: #6B7280; }
        .section-title { font-size: 11px; font-weight: bold; color: #1E40AF; margin: 12px 0 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .data-table th { background: #1E40AF; color: white; padding: 5px 6px; text-align: left; font-size: 8px; text-transform: uppercase; }
        .data-table td { padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 9px; vertical-align: top; }
        .data-table tr:nth-child(even) { background: #fafbfd; }
        .data-table .total-row { background: #e0e7ff; font-weight: bold; }
        .text-right { text-align: right; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
        .badge-paid { background: #D1FAE5; color: #065F46; }
        .badge-partial { background: #FEF3C7; color: #92400E; }
        .badge-unpaid { background: #FEE2E2; color: #991B1B; }
        .badge-unbilled { background: #E5E7EB; color: #374151; }
        .pl-block { background: #f8f9ff; border-left: 2px solid #6366F1; padding: 4px 8px; margin: 3px 0; font-size: 8.5px; }
        .pl-block strong { color: #4338CA; }
        .pl-note { color: #555; font-style: italic; margin-top: 2px; padding-left: 6px; border-left: 1.5px solid #c7d2fe; }
        .inv-block { background: #eff6ff; border-left: 2px solid #2563EB; padding: 4px 8px; margin: 2px 0 4px; font-size: 8.5px; }
        .inv-block strong { color: #1E40AF; }
        .inv-block .lbl { color: #64748b; }
        .inv-block .sep { color: #cbd5e1; margin: 0 4px; }
        .footer { margin-top: 16px; padding-top: 6px; border-top: 2px solid #1E40AF; font-size: 8px; color: #999; text-align: center; }
        .footer-brand { font-size: 10px; font-weight: bold; color: #1E40AF; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <table>
            <tr>
                <td style="width: 70%; vertical-align: middle;">
                    <div class="title">TNT Cargo — Container {{ $containerCode }}</div>
                    <div class="subtitle">{{ $detailed ? 'Rapport détaillé (avec listes de colisage)' : 'Rapport synthétique' }}</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 9px; color: #666;">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="meta-box">
        <span class="meta-label">Container:</span> <span class="meta-value">{{ $containerCode }}</span>
        <span class="meta-label">Région:</span> <span class="meta-value">{{ $selectedRegion }}</span>
        <span class="meta-label">Période:</span> <span class="meta-value">{{ $periodLabel }}</span>
        <span class="meta-label">Expéditions:</span> <span class="meta-value">{{ $shipments->count() }}</span>
    </div>

    {{-- KPIs --}}
    <table class="summary-table">
        <tr>
            <td><div class="label">Facturé</div><div class="value blue">${{ number_format($totalBilled, 2, ',', ' ') }}</div></td>
            <td><div class="label">Encaissé</div><div class="value green">${{ number_format($totalRevenue, 2, ',', ' ') }}</div></td>
            <td><div class="label">Solde dû</div><div class="value red">${{ number_format($totalOutstanding, 2, ',', ' ') }}</div></td>
            <td><div class="label">Dépenses</div><div class="value amber">${{ number_format($totalExpenses, 2, ',', ' ') }}</div></td>
            <td><div class="label">Bénéfice</div><div class="value {{ $totalProfit >= 0 ? 'blue' : 'red' }}">${{ number_format($totalProfit, 2, ',', ' ') }}</div></td>
        </tr>
    </table>

    {{-- Shipments table --}}
    <div class="section-title">Expéditions du Container</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Tracking</th>
                <th>Client</th>
                <th>Statut</th>
                <th class="text-right">Poids</th>
                <th class="text-right">CBM</th>
                <th class="text-right">Facturé</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Solde</th>
                <th>Facture</th>
                <th>Paiement</th>
            </tr>
        </thead>
        <tbody>
        @forelse($shipments as $s)
            @php
                $paymentStatus = $s['payment_status'];
                $badgeClass = 'badge-unbilled';
                if ($paymentStatus === 'paid') $badgeClass = 'badge-paid';
                elseif ($paymentStatus === 'partial') $badgeClass = 'badge-partial';
                elseif ($paymentStatus === 'unpaid') $badgeClass = 'badge-unpaid';

                $paymentLabels = [
                    'paid' => 'Payée', 'partial' => 'Partielle',
                    'unpaid' => 'Non payée', 'unbilled' => 'Non facturée'
                ];
            @endphp
            <tr>
                <td><strong>{{ $s['tracking_number'] }}</strong>
                    <div class="gray" style="font-size: 8px;">{{ $s['origin'] }} → {{ $s['destination'] }}</div>
                </td>
                <td>{{ $s['client'] ?? '—' }}</td>
                <td>{{ $s['status'] ?? '—' }}</td>
                <td class="text-right">{{ number_format($s['weight'], 2) }} kg</td>
                <td class="text-right">{{ number_format($s['volume'], 4) }}</td>
                <td class="text-right">${{ number_format($s['total_cost'], 2, ',', ' ') }}</td>
                <td class="text-right green">${{ number_format($s['amount_paid'], 2, ',', ' ') }}</td>
                <td class="text-right {{ $s['balance_due'] > 0 ? 'red' : 'gray' }}">${{ number_format($s['balance_due'], 2, ',', ' ') }}</td>
                <td>
                    @if($s['invoice'])
                        <strong>{{ $s['invoice']['invoice_number'] }}</strong>
                        <div class="gray" style="font-size: 8px;">{{ $s['invoice']['status'] }}</div>
                    @else
                        <span class="gray">—</span>
                    @endif
                </td>
                <td><span class="badge {{ $badgeClass }}">{{ $paymentLabels[$paymentStatus] ?? $paymentStatus }}</span>
                    @if($s['last_payment_date'])
                        <div class="gray" style="font-size: 8px;">{{ \Carbon\Carbon::parse($s['last_payment_date'])->format('d/m/Y') }}</div>
                    @endif
                </td>
            </tr>
            @if(!empty($s['invoice']))
                <tr>
                    <td colspan="10" style="background: #fff; padding: 2px 0;">
                        <div class="inv-block">
                            <strong>Détail facture {{ $s['invoice']['invoice_number'] }}</strong>
                            <span class="sep">·</span>
                            <span class="lbl">Frais d'expédition:</span> <strong>${{ number_format($s['invoice']['subtotal'], 2, ',', ' ') }}</strong>
                            <span class="sep">·</span>
                            <span class="lbl">Magerwa:</span> <strong>${{ number_format($s['invoice']['magerwa_price'], 2, ',', ' ') }}</strong>
                            <span class="sep">·</span>
                            <span class="lbl">Frais auxiliaires:</span> <strong>${{ number_format($s['invoice']['auxiliary_fees_total'], 2, ',', ' ') }}</strong>
                            @if(!empty($s['invoice']['auxiliary_fees']) && count($s['invoice']['auxiliary_fees']) > 0)
                                @php
                                    $auxParts = [];
                                    foreach ($s['invoice']['auxiliary_fees'] as $af) {
                                        $auxParts[] = $af['label'] . ': $' . number_format($af['amount'], 2, ',', ' ');
                                    }
                                @endphp
                                <span class="gray">({{ implode(', ', $auxParts) }})</span>
                            @endif
                            @if($s['invoice']['cash_advance_amount'] > 0)
                                <span class="sep">·</span>
                                <span class="lbl">Avance:</span> <strong style="color:#B45309;">-${{ number_format($s['invoice']['cash_advance_amount'], 2, ',', ' ') }}</strong>
                            @endif
                            <span class="sep">·</span>
                            <span class="lbl">Total:</span> <strong style="color:#1E40AF;">${{ number_format($s['invoice']['total'], 2, ',', ' ') }}</strong>
                        </div>
                    </td>
                </tr>
            @endif
            @if($detailed && !empty($s['packing_lists']) && count($s['packing_lists']) > 0)
                <tr>
                    <td colspan="10" style="background: #fff;">
                        <div style="padding: 4px 0;">
                            <strong style="color: #4338CA; font-size: 9px;">Listes de colisage ({{ count($s['packing_lists']) }})</strong>
                            @foreach($s['packing_lists'] as $pl)
                                <div class="pl-block">
                                    <strong>{{ $pl['reference'] }}</strong>
                                    — {{ $pl['parcel_count'] }} colis,
                                    {{ number_format($pl['total_cbm'], 4) }} CBM,
                                    {{ number_format($pl['total_weight'], 2) }} kg
                                    @if($pl['price_per_cbm'] > 0)
                                        · {{ number_format($pl['price_per_cbm'], 2) }} $/CBM
                                    @endif
                                    · {{ $pl['item_count'] }} articles
                                    · Frais: ${{ number_format($pl['shipping_cost'], 2, ',', ' ') }}
                                    @if($pl['additional_fees'] > 0)
                                        + ${{ number_format($pl['additional_fees'], 2, ',', ' ') }} divers
                                    @endif
                                    · Marchandise: ${{ number_format($pl['total_amount'], 2, ',', ' ') }}
                                    <span class="gray">[{{ $pl['status'] }}]</span>
                                    @if(!empty($pl['notes']))
                                        <div class="pl-note">Description: {{ $pl['notes'] }}</div>
                                    @endif
                                </div>
                            @endforeach
                        </div>
                    </td>
                </tr>
            @endif
        @empty
            <tr><td colspan="10" style="text-align: center; padding: 20px; color: #999;">Aucune expédition pour ce container.</td></tr>
        @endforelse
        @if($shipments->count() > 0)
            <tr class="total-row">
                <td colspan="3">TOTAL ({{ $shipments->count() }} expéditions)</td>
                <td class="text-right">{{ number_format($shipments->sum('weight'), 2) }} kg</td>
                <td class="text-right">{{ number_format($shipments->sum('volume'), 4) }}</td>
                <td class="text-right">${{ number_format($shipments->sum('total_cost'), 2, ',', ' ') }}</td>
                <td class="text-right">${{ number_format($shipments->sum('amount_paid'), 2, ',', ' ') }}</td>
                <td class="text-right">${{ number_format($shipments->sum('balance_due'), 2, ',', ' ') }}</td>
                <td colspan="2"></td>
            </tr>
        @endif
        </tbody>
    </table>

    <div class="footer">
        <div class="footer-brand">TNT Cargo — Rapport Container Confidentiel</div>
        <div>Container {{ $containerCode }} | {{ $selectedRegion }} | Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
