<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture {{ $invoice->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; position: relative; }
        .container { padding: 30px 30px 80px 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .company-info { font-size: 10px; color: #666; margin-top: 5px; line-height: 1.6; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1E40AF; text-align: right; }
        .invoice-number { font-size: 14px; color: #666; text-align: right; margin-top: 5px; }
        .details { margin-bottom: 25px; }
        .details table { width: 100%; }
        .details td { vertical-align: top; padding: 5px 0; width: 50%; }
        .label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 12px; margin-top: 3px; line-height: 1.5; }
        .info-box { background-color: #F0F4FF; border: 1px solid #DBEAFE; border-radius: 6px; padding: 12px 15px; margin-bottom: 20px; }
        .info-box table { width: 100%; }
        .info-box td { padding: 4px 8px; font-size: 11px; }
        .info-box .info-label { color: #555; font-weight: bold; width: 140px; }
        .info-box .info-value { color: #1E40AF; font-weight: 600; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .items-table th { background-color: #1E40AF; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        .items-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .items-table tr:nth-child(even) { background-color: #f8f9fa; }
        .text-right { text-align: right; }
        .totals { float: right; width: 300px; }
        .totals table { width: 100%; }
        .totals td { padding: 8px 12px; }
        .totals .total-row { font-size: 16px; font-weight: bold; color: #fff; background-color: #1E40AF; }
        .totals .total-row td { padding: 10px 12px; }
        .totals .balance-row { font-weight: bold; color: #DC2626; background-color: #FEF2F2; }
        .totals .paid-row { color: #059669; background-color: #ECFDF5; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 15px 30px; border-top: 3px solid #1E40AF; background: #F8FAFC; text-align: center; }
        .footer-brand { font-size: 14px; font-weight: bold; color: #1E40AF; letter-spacing: 1px; }
        .footer-info { font-size: 9px; color: #999; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-paid { background: #DEF7EC; color: #03543F; }
        .status-partial { background: #FEF3C7; color: #92400E; }
        .status-draft { background: #E5E7EB; color: #374151; }
        .status-sent { background: #DBEAFE; color: #1E40AF; }
        .status-overdue { background: #FEE2E2; color: #991B1B; }
        .status-cancelled { background: #F3F4F6; color: #6B7280; }
        .logo-img { height: 50px; width: auto; }
    </style>
</head>
<body>
    <div class="container">
        {{-- Header with logo --}}
        <table style="width:100%; margin-bottom: 25px; border-bottom: 3px solid #1E40AF; padding-bottom: 15px;">
            <tr>
                <td style="vertical-align: middle; width: 60%;">
                    <table>
                        <tr>
                            <td style="vertical-align: middle; padding-right: 12px;">
                                @if(file_exists(public_path('logo.png')))
                                    <img src="{{ public_path('logo.png') }}" class="logo-img" alt="TNT Cargo">
                                @endif
                            </td>
                            <td style="vertical-align: middle;">
                                <div class="company-name">TNT Cargo</div>
                                <div class="company-info">
                                    Logistique internationale<br>
                                    RDC<br>
                                    contact@tntcargo.com
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="text-align: right; vertical-align: top; width: 40%;">
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

        {{-- Key invoice info box --}}
        <div class="info-box">
            <table>
                <tr>
                    <td class="info-label">N° Facture</td>
                    <td class="info-value">{{ $invoice->invoice_number }}</td>
                    <td class="info-label">Date d'émission</td>
                    <td class="info-value">{{ $invoice->issue_date->format('d/m/Y') }}</td>
                </tr>
                <tr>
                    <td class="info-label">Devise</td>
                    <td class="info-value">{{ $invoice->currency }}</td>
                    <td class="info-label">Date d'échéance</td>
                    <td class="info-value">{{ $invoice->due_date->format('d/m/Y') }}</td>
                </tr>
                @if($invoice->shipment)
                <tr>
                    <td class="info-label">N° Suivi</td>
                    <td class="info-value">{{ $invoice->shipment->tracking_number }}</td>
                    <td class="info-label">Statut</td>
                    <td class="info-value">{{ strtoupper($invoice->status) }}</td>
                </tr>
                @endif
                @if($invoice->paid_date)
                <tr>
                    <td class="info-label">Date de paiement</td>
                    <td class="info-value">{{ $invoice->paid_date->format('d/m/Y') }}</td>
                    <td></td><td></td>
                </tr>
                @endif
            </table>
        </div>

        {{-- Client details --}}
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
                        @if($invoice->shipment)
                            <div class="label">Expédition</div>
                            <div class="value">
                                <strong>{{ $invoice->shipment->tracking_number }}</strong><br>
                                @if($invoice->shipment->origin){{ $invoice->shipment->origin }} &rarr; {{ $invoice->shipment->destination }}<br>@endif
                                @if($invoice->shipment->weight)Poids: {{ $invoice->shipment->weight }} kg<br>@endif
                                @if($invoice->shipment->transport_mode)Mode: {{ ucfirst($invoice->shipment->transport_mode) }}@endif
                            </div>
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        {{-- Items table --}}
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 10%;">#</th>
                    <th style="width: 40%;">Description</th>
                    <th class="text-right">Quantité</th>
                    <th class="text-right">Prix unitaire</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->description }}</td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->unit_price, 2) }} {{ $invoice->currency }}</td>
                    <td class="text-right">{{ number_format($item->total, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        {{-- Totals --}}
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
                    <td>TOTAL</td>
                    <td class="text-right">{{ number_format($invoice->total, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @if($invoice->amount_paid > 0)
                <tr class="paid-row">
                    <td>Montant payé</td>
                    <td class="text-right">{{ number_format($invoice->amount_paid, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endif
                @if($invoice->total - $invoice->amount_paid > 0)
                <tr class="balance-row">
                    <td>Solde dû</td>
                    <td class="text-right">{{ number_format($invoice->total - $invoice->amount_paid, 2) }} {{ $invoice->currency }}</td>
                </tr>
                @endif
            </table>
        </div>

        @if($invoice->notes)
        <div style="clear:both; margin-top:40px;">
            <div class="label">Notes</div>
            <div class="value" style="margin-top:5px; padding: 8px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 4px;">{{ $invoice->notes }}</div>
        </div>
        @endif

        {{-- Footer --}}
        <div class="footer">
            <div class="footer-brand">TNT Cargo System</div>
            <div class="footer-info">
                Logistique internationale &mdash; RDC &mdash; contact@tntcargo.com<br>
                Facture {{ $invoice->invoice_number }} &mdash; Générée le {{ now()->format('d/m/Y à H:i') }}
            </div>
        </div>
    </div>
</body>
</html>
