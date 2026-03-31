<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Reçu {{ $flightTicket->ticket_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; }
        .container { padding: 30px 30px 80px 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .company-info { font-size: 10px; color: #666; margin-top: 5px; line-height: 1.6; }
        .receipt-title { font-size: 28px; font-weight: bold; color: #1E40AF; text-align: right; }
        .receipt-number { font-size: 14px; color: #666; text-align: right; margin-top: 5px; }
        .info-box { background-color: #F0F4FF; border: 1px solid #DBEAFE; border-radius: 6px; padding: 12px 15px; margin-bottom: 20px; }
        .info-box table { width: 100%; }
        .info-box td { padding: 4px 8px; font-size: 11px; }
        .info-box .info-label { color: #555; font-weight: bold; width: 140px; }
        .info-box .info-value { color: #1E40AF; font-weight: 600; }
        .section-title { font-size: 14px; font-weight: bold; color: #1E40AF; margin: 20px 0 10px; border-bottom: 2px solid #DBEAFE; padding-bottom: 5px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .details-table td { padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
        .details-table .label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; width: 40%; }
        .details-table .value { font-size: 12px; }
        .flight-route { text-align: center; margin: 20px 0; padding: 15px; background: #F0F4FF; border-radius: 8px; }
        .flight-route .city { font-size: 22px; font-weight: bold; color: #1E40AF; }
        .flight-route .airport { font-size: 12px; color: #666; }
        .flight-route .arrow { font-size: 24px; color: #1E40AF; margin: 0 15px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th { background-color: #1E40AF; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        .items-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .items-table tr:nth-child(even) { background-color: #f8f9fa; }
        .text-right { text-align: right; }
        .totals { float: right; width: 300px; margin-top: 10px; }
        .totals table { width: 100%; }
        .totals td { padding: 8px 12px; }
        .totals .total-row { font-size: 16px; font-weight: bold; color: #fff; background-color: #1E40AF; }
        .totals .total-row td { padding: 10px 12px; }
        .totals .paid-row { color: #059669; background-color: #ECFDF5; font-weight: bold; }
        .totals .balance-row { font-weight: bold; color: #DC2626; background-color: #FEF2F2; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-reserved { background: #FEF3C7; color: #92400E; }
        .status-confirmed { background: #DBEAFE; color: #1E40AF; }
        .status-paid { background: #DEF7EC; color: #03543F; }
        .status-cancelled { background: #F3F4F6; color: #6B7280; }
        .status-refunded { background: #FEE2E2; color: #991B1B; }
        .logo-img { height: 50px; width: auto; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 15px 30px; border-top: 3px solid #1E40AF; background: #F8FAFC; text-align: center; }
        .footer-brand { font-size: 14px; font-weight: bold; color: #1E40AF; letter-spacing: 1px; }
        .footer-info { font-size: 9px; color: #999; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="container">
        {{-- Header --}}
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
                                    Logistique internationale & Billetterie<br>
                                    Goma, RDC<br>
                                    contact@tntcargo.com
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="text-align: right; vertical-align: top; width: 40%;">
                    <div class="receipt-title">REÇU</div>
                    <div class="receipt-number">{{ $flightTicket->ticket_number }}</div>
                    <div style="margin-top:8px;">
                        <span class="status-badge status-{{ $flightTicket->status }}">
                            {{ strtoupper($flightTicket->status) }}
                        </span>
                    </div>
                </td>
            </tr>
        </table>

        {{-- Ticket info --}}
        <div class="info-box">
            <table>
                <tr>
                    <td class="info-label">N° Billet</td>
                    <td class="info-value">{{ $flightTicket->ticket_number }}</td>
                    <td class="info-label">Date d'émission</td>
                    <td class="info-value">{{ $flightTicket->created_at->format('d/m/Y') }}</td>
                </tr>
                <tr>
                    <td class="info-label">Type de trajet</td>
                    <td class="info-value">{{ $flightTicket->trip_type === 'round_trip' ? 'Aller-Retour' : 'Aller Simple' }}</td>
                    <td class="info-label">Classe</td>
                    <td class="info-value">
                        @php
                            $classes = ['economy' => 'Économique', 'premium_economy' => 'Éco Premium', 'business' => 'Affaires', 'first' => 'Première'];
                        @endphp
                        {{ $classes[$flightTicket->travel_class] ?? $flightTicket->travel_class }}
                    </td>
                </tr>
                <tr>
                    <td class="info-label">Compagnie</td>
                    <td class="info-value">{{ $flightTicket->airline }}</td>
                    @if($flightTicket->flight_number)
                    <td class="info-label">N° Vol</td>
                    <td class="info-value">{{ $flightTicket->flight_number }}</td>
                    @else
                    <td></td><td></td>
                    @endif
                </tr>
            </table>
        </div>

        {{-- Flight Route --}}
        <div class="flight-route">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 40%; text-align: center;">
                        <div class="city">{{ $flightTicket->departure_city }}</div>
                        <div class="airport">{{ $flightTicket->departure_airport }}{{ $flightTicket->departure_country ? ' - ' . $flightTicket->departure_country : '' }}</div>
                        <div style="font-size: 11px; color: #666; margin-top: 5px;">{{ $flightTicket->departure_date->format('d/m/Y H:i') }}</div>
                    </td>
                    <td style="width: 20%; text-align: center;">
                        <span class="arrow">✈ →</span>
                    </td>
                    <td style="width: 40%; text-align: center;">
                        <div class="city">{{ $flightTicket->arrival_city }}</div>
                        <div class="airport">{{ $flightTicket->arrival_airport }}{{ $flightTicket->arrival_country ? ' - ' . $flightTicket->arrival_country : '' }}</div>
                        @if($flightTicket->arrival_date)
                        <div style="font-size: 11px; color: #666; margin-top: 5px;">{{ $flightTicket->arrival_date->format('d/m/Y H:i') }}</div>
                        @endif
                    </td>
                </tr>
            </table>
            @if($flightTicket->trip_type === 'round_trip' && $flightTicket->return_date)
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #BFDBFE;">
                    <span style="font-size: 11px; color: #666;">Retour: {{ $flightTicket->return_date->format('d/m/Y H:i') }}</span>
                </div>
            @endif
        </div>

        {{-- Passenger Details --}}
        <div class="section-title">Informations Passager</div>
        <table class="details-table">
            <tr>
                <td class="label">Nom du passager</td>
                <td class="value">{{ $flightTicket->passenger_name }}</td>
            </tr>
            @if($flightTicket->passport_number)
            <tr>
                <td class="label">N° Passeport</td>
                <td class="value">{{ $flightTicket->passport_number }}</td>
            </tr>
            @endif
            @if($flightTicket->passenger_phone)
            <tr>
                <td class="label">Téléphone</td>
                <td class="value">{{ $flightTicket->passenger_phone }}</td>
            </tr>
            @endif
            @if($flightTicket->passenger_email)
            <tr>
                <td class="label">Email</td>
                <td class="value">{{ $flightTicket->passenger_email }}</td>
            </tr>
            @endif
            @if($flightTicket->client)
            <tr>
                <td class="label">Client</td>
                <td class="value">{{ $flightTicket->client->name }}</td>
            </tr>
            @endif
        </table>

        {{-- Pricing --}}
        <div class="section-title">Détails Financiers</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Montant ({{ $flightTicket->currency }})</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Prix du billet</td>
                    <td class="text-right">{{ number_format($flightTicket->ticket_price, 2) }}</td>
                </tr>
                @if($flightTicket->service_fee > 0)
                <tr>
                    <td>Frais de service</td>
                    <td class="text-right">{{ number_format($flightTicket->service_fee, 2) }}</td>
                </tr>
                @endif
                @if($flightTicket->taxes > 0)
                <tr>
                    <td>Taxes</td>
                    <td class="text-right">{{ number_format($flightTicket->taxes, 2) }}</td>
                </tr>
                @endif
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr class="total-row">
                    <td>Total</td>
                    <td class="text-right">{{ number_format($flightTicket->total_price, 2) }} {{ $flightTicket->currency }}</td>
                </tr>
                <tr class="paid-row">
                    <td>Montant payé</td>
                    <td class="text-right">{{ number_format($flightTicket->amount_paid, 2) }} {{ $flightTicket->currency }}</td>
                </tr>
                @if($flightTicket->balance_due > 0)
                <tr class="balance-row">
                    <td>Reste à payer</td>
                    <td class="text-right">{{ number_format($flightTicket->balance_due, 2) }} {{ $flightTicket->currency }}</td>
                </tr>
                @endif
            </table>
        </div>

        <div style="clear: both;"></div>

        @if($flightTicket->payment_method)
        <div style="margin-top: 20px; font-size: 11px; color: #666;">
            @php
                $methods = ['cash' => 'Espèces', 'bank_transfer' => 'Virement bancaire', 'mobile_money' => 'Mobile Money', 'card' => 'Carte bancaire', 'other' => 'Autre'];
            @endphp
            <strong>Méthode de paiement:</strong> {{ $methods[$flightTicket->payment_method] ?? $flightTicket->payment_method }}
        </div>
        @endif

        @if($flightTicket->notes)
        <div style="margin-top: 15px; padding: 10px; background: #FEF3C7; border-radius: 6px; font-size: 11px;">
            <strong>Notes:</strong> {{ $flightTicket->notes }}
        </div>
        @endif
    </div>

    <div class="footer">
        <div class="footer-brand">TNT CARGO</div>
        <div class="footer-info">Logistique internationale & Billetterie • Goma, RDC • contact@tntcargo.com</div>
    </div>
</body>
</html>
