<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture {{ $invoice->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; }
        .container { padding: 30px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #1E40AF; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .company-info { font-size: 10px; color: #666; margin-top: 5px; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1E40AF; text-align: right; }
        .invoice-number { font-size: 14px; color: #666; text-align: right; margin-top: 5px; }
        .details { margin-bottom: 25px; }
        .details table { width: 100%; }
        .details td { vertical-align: top; padding: 5px 0; width: 50%; }
        .label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; }
        .value { font-size: 12px; margin-top: 3px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .items-table th { background-color: #1E40AF; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        .items-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .items-table tr:nth-child(even) { background-color: #f8f9fa; }
        .text-right { text-align: right; }
        .totals { float: right; width: 280px; }
        .totals table { width: 100%; }
        .totals td { padding: 6px 12px; }
        .totals .total-row { font-size: 16px; font-weight: bold; color: #1E40AF; border-top: 2px solid #1E40AF; }
        .footer { clear: both; margin-top: 60px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-paid { background: #DEF7EC; color: #03543F; }
        .status-partial { background: #FEF3C7; color: #92400E; }
        .status-draft { background: #E5E7EB; color: #374151; }
        .status-overdue { background: #FEE2E2; color: #991B1B; }
    </style>
</head>
<body>
    <div class="container">
        <table style="width:100%; margin-bottom: 30px; border-bottom: 3px solid #1E40AF; padding-bottom: 20px;">
            <tr>
                <td style="vertical-align: top;">
                    <div class="company-name">TNT Cargo</div>
                    <div class="company-info">
                        Logistique internationale<br>
                        Goma, RDC<br>
                        contact@tntcargo.com
                    </div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div class="invoice-title">FACTURE</div>
                    <div class="invoice-number">{{ $invoice->invoice_number }}</div>
                    <div style="margin-top:8px;">
                        <span class="status-badge status-{{ $invoice->status }}">
                            {{ strtoupper($invoice->status) }}
                        </span>
                    </div>
                </td>
            </tr>
        </table>

        <div class="details">
            <table>
                <tr>
                    <td>
                        <div class="label">Facturé à</div>
                        <div class="value">
                            <strong>{{ $invoice->client->name }}</strong><br>
                            @if($invoice->client->company){{ $invoice->client->company }}<br>@endif
                            @if($invoice->client->address){{ $invoice->client->address }}<br>@endif
                            @if($invoice->client->email){{ $invoice->client->email }}<br>@endif
                            @if($invoice->client->phone){{ $invoice->client->phone }}@endif
                        </div>
                    </td>
                    <td class="text-right">
                        <div class="label">Date d'émission</div>
                        <div class="value">{{ $invoice->issue_date->format('d/m/Y') }}</div>
                        <br>
                        <div class="label">Date d'échéance</div>
                        <div class="value">{{ $invoice->due_date->format('d/m/Y') }}</div>
                        @if($invoice->shipment)
                        <br>
                        <div class="label">N° Suivi</div>
                        <div class="value">{{ $invoice->shipment->tracking_number }}</div>
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 50%;">Description</th>
                    <th class="text-right">Quantité</th>
                    <th class="text-right">Prix unitaire</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->unit_price, 2) }} {{ $invoice->currency }}</td>
                    <td class="text-right">{{ number_format($item->total, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr>
                    <td>Sous-total</td>
                    <td class="text-right">{{ number_format($invoice->subtotal, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @if($invoice->tax_amount > 0)
                <tr>
                    <td>Taxes</td>
                    <td class="text-right">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endif
                @if($invoice->discount_amount > 0)
                <tr>
                    <td>Remise</td>
                    <td class="text-right">-{{ number_format($invoice->discount_amount, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endif
                <tr class="total-row">
                    <td>Total</td>
                    <td class="text-right">{{ number_format($invoice->total, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @if($invoice->amount_paid > 0)
                <tr>
                    <td>Payé</td>
                    <td class="text-right">{{ number_format($invoice->amount_paid, 2) }} {{ $invoice->currency }}</td>
                </tr>
                <tr style="font-weight:bold;">
                    <td>Solde dû</td>
                    <td class="text-right">{{ number_format($invoice->total - $invoice->amount_paid, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endif
            </table>
        </div>

        @if($invoice->notes)
        <div style="clear:both; margin-top:40px;">
            <div class="label">Notes</div>
            <div class="value" style="margin-top:5px;">{{ $invoice->notes }}</div>
        </div>
        @endif

        <div class="footer">
            TNT Cargo &mdash; Logistique internationale &mdash; Goma, RDC<br>
            Cette facture a été générée automatiquement.
        </div>
    </div>
</body>
</html>
