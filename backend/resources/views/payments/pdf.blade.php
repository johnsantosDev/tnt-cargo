<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Reçu {{ $payment->reference }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; }
        .container { padding: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .company-info { font-size: 10px; color: #666; margin-top: 5px; }
        .receipt-title { font-size: 28px; font-weight: bold; color: #1E40AF; text-align: right; }
        .receipt-number { font-size: 14px; color: #666; text-align: right; margin-top: 5px; }
        .label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; }
        .value { font-size: 12px; margin-top: 3px; }
        .text-right { text-align: right; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .info-table td { padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
        .info-table .info-label { font-weight: bold; color: #555; width: 40%; background: #f8f9fa; }
        .amount-box { background: #1E40AF; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; }
        .amount-box .amount { font-size: 32px; font-weight: bold; }
        .amount-box .amount-label { font-size: 11px; text-transform: uppercase; opacity: 0.8; margin-bottom: 5px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-completed { background: #DEF7EC; color: #03543F; }
        .status-pending { background: #FEF3C7; color: #92400E; }
        .status-cancelled { background: #FEE2E2; color: #991B1B; }
        .footer { margin-top: 60px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
        .performer-box { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 15px; margin-top: 25px; }
        .performer-box .label { color: #1E40AF; }
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
                        RDC<br>
                        contact@agencetntcargo.com
                    </div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div class="receipt-title">REÇU DE PAIEMENT</div>
                    <div class="receipt-number">{{ $payment->reference }}</div>
                    <div style="margin-top:8px;">
                        <span class="status-badge status-{{ $payment->status }}">
                            {{ strtoupper($payment->status) }}
                        </span>
                    </div>
                </td>
            </tr>
        </table>

        <div class="amount-box">
            <div class="amount-label">Montant du paiement</div>
            <div class="amount">{{ number_format($payment->amount, 2) }} {{ $payment->currency ?? 'USD' }}</div>
        </div>

        <table class="info-table">
            <tr>
                <td class="info-label">Client</td>
                <td>
                    <strong>{{ $payment->client->name }}</strong><br>
                    @if($payment->client->phone){{ $payment->client->phone }}<br>@endif
                    @if($payment->client->email){{ $payment->client->email }}@endif
                </td>
            </tr>
            <tr>
                <td class="info-label">Méthode de paiement</td>
                <td>
                    @php
                        $methods = ['cash' => 'Espèces', 'mobile_money' => 'Mobile Money', 'bank_transfer' => 'Virement bancaire', 'check' => 'Chèque', 'other' => 'Autre'];
                    @endphp
                    {{ $methods[$payment->method] ?? $payment->method }}
                </td>
            </tr>
            <tr>
                <td class="info-label">Type</td>
                <td>
                    @php
                        $types = ['income' => 'Revenu', 'expense' => 'Dépense', 'refund' => 'Remboursement'];
                    @endphp
                    {{ $types[$payment->type] ?? $payment->type }}
                </td>
            </tr>
            <tr>
                <td class="info-label">Date</td>
                <td>{{ $payment->payment_date->format('d/m/Y') }}</td>
            </tr>
            @if($payment->shipment)
            <tr>
                <td class="info-label">Expédition</td>
                <td>{{ $payment->shipment->tracking_number }}</td>
            </tr>
            @endif
            @if($payment->notes)
            <tr>
                <td class="info-label">Notes</td>
                <td>{{ $payment->notes }}</td>
            </tr>
            @endif
        </table>

        <div class="performer-box">
            <table style="width:100%;">
                <tr>
                    <td style="width:50%;">
                        <div class="label">Reçu par</div>
                        <div class="value" style="margin-top:5px;">
                            <strong>{{ $payment->receiver?->name ?? '-' }}</strong><br>
                            @if($payment->receiver?->email)
                            <span style="font-size:10px; color:#666;">{{ $payment->receiver->email }}</span>
                            @endif
                        </div>
                    </td>
                    <td style="width:50%;">
                        <div class="label">Enregistré par</div>
                        <div class="value" style="margin-top:5px;">
                            <strong>{{ $payment->creator?->name ?? '-' }}</strong><br>
                            @if($payment->creator?->email)
                            <span style="font-size:10px; color:#666;">{{ $payment->creator->email }}</span>
                            @endif
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>TNT Cargo - Logistique internationale | RDC</p>
            <p>Document généré le {{ now()->format('d/m/Y à H:i') }}</p>
        </div>
    </div>
</body>
</html>
