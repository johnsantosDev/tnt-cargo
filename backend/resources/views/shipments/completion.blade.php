<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Shipment Completion</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }
        .container { padding: 24px; }
        .header { border-bottom: 2px solid #1e40af; margin-bottom: 18px; padding-bottom: 12px; }
        .title { font-size: 22px; font-weight: bold; color: #1e40af; }
        .muted { font-size: 11px; color: #666; }
        .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .table th, .table td { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
        .table th { background: #eef2ff; font-size: 10px; text-transform: uppercase; }
        .section-title { font-size: 14px; font-weight: bold; color: #1e40af; margin: 20px 0 8px; }
        .sig { margin-top: 36px; }
        .sig-line { display: inline-block; width: 45%; border-bottom: 1px solid #333; margin: 0 2%; }
        .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="title">TNT Cargo — Completion Document</div>
        <div class="muted">Tracking: {{ $shipment->tracking_number }} | Completed: {{ optional($shipment->completed_at)->format('d/m/Y H:i') }}</div>
    </div>

    <div class="section-title">Shipment Info</div>
    <table class="table">
        <tr><th>Client</th><td>{{ $shipment->client?->name }}</td><th>Phone</th><td>{{ $shipment->client?->phone }}</td></tr>
        <tr><th>Origin</th><td>{{ $shipment->origin }}</td><th>Destination</th><td>{{ $shipment->destination }}</td></tr>
        <tr><th>Weight</th><td>{{ $shipment->weight }} kg</td><th>Volume</th><td>{{ $shipment->volume }} CBM</td></tr>
        <tr><th>Total Cost</th><td>${{ number_format($shipment->total_cost, 2) }}</td><th>Paid</th><td>${{ number_format($shipment->amount_paid, 2) }}</td></tr>
        <tr><th>Balance</th><td>${{ number_format($shipment->balance_due, 2) }}</td><th>Status</th><td>{{ $shipment->status?->name }}</td></tr>
    </table>

    @if($packingItems->count() > 0)
    <div class="section-title">Items Withdrawn</div>
    <table class="table">
        <thead>
        <tr><th>#</th><th>Description</th><th>Qty</th><th>Weight</th><th>CBM</th><th>Price</th></tr>
        </thead>
        <tbody>
        @foreach($packingItems as $i => $item)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ $item->description }}</td>
            <td>{{ $item->quantity }}</td>
            <td>{{ $item->weight ?? '-' }}</td>
            <td>{{ $item->cbm }}</td>
            <td>${{ number_format($item->total_price, 2) }}</td>
        </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <div class="sig">
        <p>By signing below, the client acknowledges withdrawal of all items listed above.</p>
        <br><br>
        <span class="sig-line">&nbsp;</span>
        <span class="sig-line">&nbsp;</span>
        <br>
        <div style="margin-top: 4px;">
            <span style="display:inline-block;width:45%;text-align:center;margin:0 2%;font-size:10px;">Client Signature</span>
            <span style="display:inline-block;width:45%;text-align:center;margin:0 2%;font-size:10px;">Agent Signature</span>
        </div>
    </div>

    <div class="footer">TNT Cargo — Document confidentiel</div>
</div>
</body>
</html>
