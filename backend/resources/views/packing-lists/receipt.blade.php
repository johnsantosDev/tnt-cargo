<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Packing List - {{ $packingList->reference }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        .container { padding: 24px; }
        .header { border-bottom: 3px solid #1e40af; margin-bottom: 16px; padding-bottom: 10px; }
        .header table { width: 100%; }
        .title { font-size: 22px; font-weight: bold; color: #1e40af; }
        .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
        .muted { font-size: 10px; color: #888; }
        .info-box { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
        .info-box table { width: 100%; }
        .info-box td { padding: 3px 6px; font-size: 11px; }
        .info-label { color: #555; font-weight: bold; width: 130px; }
        .info-value { color: #1e40af; font-weight: 600; }
        .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .table th { background: #1e40af; color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
        .table td { border-bottom: 1px solid #eee; padding: 7px 8px; }
        .table tr:nth-child(even) { background: #f9fafb; }
        .text-right { text-align: right; }
        .totals { float: right; width: 280px; margin-top: 16px; }
        .totals table { width: 100%; }
        .totals td { padding: 5px 8px; font-size: 11px; }
        .totals .total-row { font-size: 14px; font-weight: bold; color: #fff; background: #1e40af; }
        .totals .total-row td { padding: 8px; }
        .fees-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 12px; margin-top: 14px; font-size: 11px; }
        .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; margin-top: 10px; font-size: 11px; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .status-draft { background: #fef3c7; color: #92400e; }
        .status-finalized { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #d1fae5; color: #065f46; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid #1e40af; font-size: 9px; color: #888; text-align: center; }
        .footer-brand { font-size: 12px; font-weight: bold; color: #1e40af; }
    </style>
</head>
<body>
<div class="container">
    {{-- Header --}}
    <div class="header">
        <table>
            <tr>
                <td style="vertical-align: middle; width: 60%;">
                    <div class="title">TNT Cargo</div>
                    <div class="subtitle">Logistique internationale — RDC</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 20px; font-weight: bold; color: #1e40af;">PACKING LIST</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">{{ $packingList->reference }}</div>
                    <div style="margin-top: 6px;">
                        <span class="status-badge status-{{ $packingList->status }}">{{ strtoupper($packingList->status) }}</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- Info box --}}
    <div class="info-box">
        <table>
            <tr>
                <td class="info-label">Client</td>
                <td class="info-value">{{ $packingList->client?->name }}</td>
                <td class="info-label">Téléphone</td>
                <td class="info-value">{{ ($packingList->client?->phone_code ?? '+243') }} {{ $packingList->client?->phone }}</td>
            </tr>
            <tr>
                <td class="info-label">Date de création</td>
                <td class="info-value">{{ $packingList->created_at?->format('d/m/Y') }}</td>
                <td class="info-label">Référence</td>
                <td class="info-value">{{ $packingList->reference }}</td>
            </tr>
            @if($packingList->shipment)
            <tr>
                <td class="info-label">Expédition</td>
                <td class="info-value">{{ $packingList->shipment?->tracking_number }}</td>
                <td class="info-label">Statut</td>
                <td class="info-value">{{ strtoupper($packingList->status) }}</td>
            </tr>
            @endif
        </table>
    </div>

    {{-- Items table --}}
    <table class="table">
        <thead>
            <tr>
                <th style="width:5%;">#</th>
                <th style="width:30%;">Description</th>
                <th class="text-right">Qté</th>
                <th class="text-right">Poids (kg)</th>
                <th class="text-right">CBM</th>
                <th class="text-right">Prix unit.</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($packingList->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>
                    {{ $item->description }}
                    @if($item->length && $item->width && $item->height)
                        <br><span class="muted">{{ $item->length }}×{{ $item->width }}×{{ $item->height }} cm</span>
                    @endif
                    @if($item->received_at)
                        <br><span class="muted">Reçu: {{ \Carbon\Carbon::parse($item->received_at)->format('d/m/Y') }}</span>
                    @endif
                </td>
                <td class="text-right">{{ $item->quantity }}</td>
                <td class="text-right">{{ $item->weight ? number_format($item->weight, 2) : '-' }}</td>
                <td class="text-right">{{ number_format($item->cbm ?? 0, 4) }}</td>
                <td class="text-right">${{ number_format($item->unit_price, 2) }}</td>
                <td class="text-right">${{ number_format($item->total_price, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Fees description --}}
    @if($packingList->fees_description)
    <div class="fees-box">
        <strong>Description des frais supplémentaires:</strong> {{ $packingList->fees_description }}
    </div>
    @endif

    {{-- Notes --}}
    @if($packingList->notes)
    <div class="notes-box">
        <strong>Notes:</strong> {{ $packingList->notes }}
    </div>
    @endif

    {{-- Totals --}}
    <div class="totals">
        <table>
            <tr>
                <td>Total articles</td>
                <td class="text-right">${{ number_format($packingList->total_amount ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td>Total CBM</td>
                <td class="text-right">{{ number_format($packingList->total_cbm ?? 0, 4) }} m³</td>
            </tr>
            <tr>
                <td>Poids total</td>
                <td class="text-right">{{ number_format($packingList->total_weight ?? 0, 2) }} kg</td>
            </tr>
            <tr>
                <td>Prix par CBM</td>
                <td class="text-right">${{ number_format($packingList->price_per_cbm ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td>Frais d'expédition</td>
                <td class="text-right">${{ number_format($packingList->shipping_cost ?? 0, 2) }}</td>
            </tr>
            @if($packingList->additional_fees > 0)
            <tr>
                <td>Frais supplémentaires
                    @if($packingList->fees_description)
                    <br><span class="muted">({{ $packingList->fees_description }})</span>
                    @endif
                </td>
                <td class="text-right">${{ number_format($packingList->additional_fees, 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td>TOTAL GÉNÉRAL</td>
                <td class="text-right">${{ number_format(($packingList->total_amount ?? 0) + ($packingList->shipping_cost ?? 0) + ($packingList->additional_fees ?? 0), 2) }}</td>
            </tr>
        </table>
    </div>

    <div style="clear:both;"></div>

    {{-- Footer --}}
    <div class="footer">
        <div class="footer-brand">TNT Cargo System</div>
        <div>Logistique internationale — RDC — contact@agencetntcargo.com</div>
        <div>Packing List {{ $packingList->reference }} — Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
