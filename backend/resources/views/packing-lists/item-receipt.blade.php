<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Packing List Item Receipt</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }
        .container { padding: 24px; }
        .header { border-bottom: 2px solid #1e40af; margin-bottom: 16px; padding-bottom: 10px; }
        .title { font-size: 20px; font-weight: bold; color: #1e40af; }
        .muted { font-size: 11px; color: #666; }
        .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        .table th { background: #eef2ff; font-size: 10px; text-transform: uppercase; }
        .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="title">TNT Cargo — Packing List Item Receipt</div>
        <div class="muted">Packing List: {{ $packingList->reference }} | Date: {{ now()->format('d/m/Y H:i') }}</div>
    </div>

    <table class="table">
        <tr><th>Client</th><td>{{ $packingList->client?->name }}</td></tr>
        <tr><th>Phone</th><td>{{ ($packingList->client?->phone_code ?? '+243') }} {{ $packingList->client?->phone }}</td></tr>
        @if($packingList->additional_fees > 0)
        <tr><th>Frais supplémentaires</th><td>${{ number_format($packingList->additional_fees, 2) }}</td></tr>
        @endif
        @if($packingList->fees_description)
        <tr><th>Description des frais</th><td>{{ $packingList->fees_description }}</td></tr>
        @endif
    </table>

    <table class="table" style="margin-top: 16px;">
        <thead>
        <tr><th>Description</th><th>Qty</th><th>Weight</th><th>CBM</th><th>Unit Price</th><th>Total</th></tr>
        </thead>
        <tbody>
        <tr>
            <td>{{ $item->description }}</td>
            <td>{{ $item->quantity }}</td>
            <td>{{ $item->weight ?? '-' }} kg</td>
            <td>{{ $item->cbm }}</td>
            <td>${{ number_format($item->unit_price, 2) }}</td>
            <td>${{ number_format($item->total_price, 2) }}</td>
        </tr>
        </tbody>
    </table>

    @if($item->notes)
    <p style="margin-top: 12px;"><strong>Notes:</strong> {{ $item->notes }}</p>
    @endif

    {{-- Summary --}}
    <table class="table" style="margin-top: 16px;">
        <tr><th>Prix par CBM</th><td>${{ number_format($packingList->price_per_cbm ?? 0, 2) }}</td></tr>
        <tr><th>Coût d'expédition</th><td>${{ number_format($packingList->shipping_cost ?? 0, 2) }}</td></tr>
        @if($packingList->additional_fees > 0)
        <tr><th>Frais supplémentaires</th><td>${{ number_format($packingList->additional_fees, 2) }}@if($packingList->fees_description) — {{ $packingList->fees_description }}@endif</td></tr>
        @endif
        <tr><th>Total Général</th><td style="font-weight:bold;">${{ number_format(($packingList->total_amount ?? 0) + ($packingList->shipping_cost ?? 0) + ($packingList->additional_fees ?? 0), 2) }}</td></tr>
    </table>

    <div class="footer">TNT Cargo — Document confidentiel</div>
</div>
</body>
</html>
