<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Transfert Complété - {{ $transfer->reference }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        .container { padding: 24px; }
        .header { border-bottom: 3px solid #166534; margin-bottom: 16px; padding-bottom: 10px; }
        .header table { width: 100%; }
        .title { font-size: 22px; font-weight: bold; color: #166534; }
        .subtitle { font-size: 11px; color: #666; margin-top: 4px; }
        .muted { font-size: 10px; color: #888; }
        .section-title { font-size: 13px; font-weight: bold; color: #166534; margin: 16px 0 8px; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px; }
        .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 12px 16px; margin-bottom: 14px; }
        .info-box table { width: 100%; }
        .info-box td { padding: 4px 8px; font-size: 11px; }
        .info-label { color: #555; font-weight: bold; width: 140px; }
        .info-value { color: #166534; font-weight: 600; }
        .completed-banner { background: #166534; color: #fff; text-align: center; padding: 14px; border-radius: 6px; margin: 16px 0; }
        .completed-banner .big { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .completed-banner .sub { font-size: 11px; margin-top: 4px; opacity: 0.9; }
        .amount-box { background: #ecfdf5; border: 2px solid #059669; border-radius: 6px; padding: 16px; text-align: center; margin: 16px 0; }
        .amount-value { font-size: 28px; font-weight: bold; color: #059669; }
        .amount-label { font-size: 11px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
        .route-box { text-align: center; margin: 12px 0; }
        .route-from, .route-to { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 8px 16px; font-weight: bold; color: #166534; }
        .route-arrow { display: inline-block; padding: 0 12px; font-size: 18px; color: #999; }
        .timeline { margin: 16px 0; }
        .timeline table { width: 100%; border-collapse: collapse; }
        .timeline th { background: #166534; color: #fff; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; }
        .timeline td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .timeline tr:nth-child(even) { background: #f9fafb; }
        .ack-box { background: #fefce8; border: 2px solid #ca8a04; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 11px; }
        .ack-box .ack-title { font-size: 12px; font-weight: bold; color: #92400e; margin-bottom: 6px; }
        .signatures { margin-top: 30px; width: 100%; }
        .signatures td { padding: 8px 0; width: 50%; vertical-align: bottom; }
        .sig-line { border-top: 1px solid #999; width: 80%; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #555; }
        .footer { margin-top: 24px; padding-top: 8px; border-top: 2px solid #166534; font-size: 9px; color: #888; text-align: center; }
        .footer-brand { font-size: 12px; font-weight: bold; color: #166534; }
    </style>
</head>
<body>
<div class="container">
    {{-- Header --}}
    <div class="header">
        <table>
            <tr>
                <td style="width: 60%; vertical-align: middle;">
                    <div class="title">TNT Cargo</div>
                    <div class="subtitle">Service de Transfert — Document de Finalisation</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 16px; font-weight: bold; color: #166534;">ACCUSÉ DE RÉCEPTION</div>
                    <div class="muted" style="margin-top: 4px;">{{ $transfer->reference }}</div>
                </td>
            </tr>
        </table>
    </div>

    {{-- Completed banner --}}
    <div class="completed-banner">
        <div class="big">✓ TRANSFERT COMPLÉTÉ</div>
        <div class="sub">Le client a reçu les fonds — {{ $transfer->completed_at?->format('d/m/Y à H:i') }}</div>
    </div>

    {{-- Amount --}}
    <div class="amount-box">
        <div class="amount-label">Montant Remis au Client</div>
        <div class="amount-value">{{ number_format($transfer->amount, 2, ',', ' ') }} {{ $transfer->currency }}</div>
        @if($transfer->transfer_fee > 0)
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #a7f3d0; font-size: 12px; color: #374151;">
            <span>Frais de transfert:</span>
            <strong>{{ number_format($transfer->transfer_fee, 2, ',', ' ') }} {{ $transfer->currency }}</strong>
        </div>
        <div style="margin-top: 4px; font-size: 13px; font-weight: bold; color: #065f46;">
            Total facturé: {{ number_format($transfer->amount + $transfer->transfer_fee, 2, ',', ' ') }} {{ $transfer->currency }}
        </div>
        @endif
    </div>

    {{-- Route --}}
    <div class="route-box">
        <span class="route-from">{{ $transfer->origin_region }}</span>
        <span class="route-arrow">→</span>
        <span class="route-to">{{ $transfer->destination_region }}</span>
    </div>

    {{-- Client info --}}
    <div class="section-title">Informations du Client</div>
    <div class="info-box">
        <table>
            <tr>
                <td class="info-label">Nom du client</td>
                <td class="info-value">{{ $transfer->client_name }}</td>
                <td class="info-label">Téléphone</td>
                <td class="info-value">{{ $transfer->client_phone ?: '—' }}</td>
            </tr>
            <tr>
                <td class="info-label">Code de transfert</td>
                <td class="info-value">{{ $transfer->transfer_code }}</td>
                <td class="info-label">Référence</td>
                <td class="info-value">{{ $transfer->reference }}</td>
            </tr>
        </table>
    </div>

    {{-- Timeline --}}
    <div class="section-title">Chronologie du Transfert</div>
    <div class="timeline">
        <table>
            <thead>
                <tr>
                    <th>Étape</th>
                    <th>Responsable</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Création</strong> — Dépôt des fonds</td>
                    <td>{{ $transfer->creator?->name ?? '—' }}</td>
                    <td>{{ $transfer->created_at?->format('d/m/Y à H:i') }}</td>
                </tr>
                @if($transfer->approver)
                <tr>
                    <td><strong>Approbation</strong> — Validation manager</td>
                    <td>{{ $transfer->approver->name }}</td>
                    <td>{{ $transfer->approved_at?->format('d/m/Y à H:i') }}</td>
                </tr>
                @endif
                @if($transfer->completer)
                <tr>
                    <td><strong>Finalisation</strong> — Remise des fonds</td>
                    <td>{{ $transfer->completer->name }}</td>
                    <td>{{ $transfer->completed_at?->format('d/m/Y à H:i') }}</td>
                </tr>
                @endif
            </tbody>
        </table>
    </div>

    {{-- Notes --}}
    @if($transfer->notes)
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; margin: 10px 0; font-size: 11px;">
        <strong>Notes:</strong> {{ $transfer->notes }}
    </div>
    @endif

    {{-- Acknowledgement --}}
    <div class="ack-box">
        <div class="ack-title">DÉCLARATION DU CLIENT</div>
        Je soussigné(e), <strong>{{ $transfer->client_name }}</strong>, confirme avoir reçu la somme de
        <strong>{{ number_format($transfer->amount, 2, ',', ' ') }} {{ $transfer->currency }}</strong>
        @if($transfer->transfer_fee > 0)
        (frais de transfert: <strong>{{ number_format($transfer->transfer_fee, 2, ',', ' ') }} {{ $transfer->currency }}</strong>,
        total facturé: <strong>{{ number_format($transfer->amount + $transfer->transfer_fee, 2, ',', ' ') }} {{ $transfer->currency }}</strong>)
        @endif
        au bureau de <strong>{{ $transfer->destination_region }}</strong>,
        correspondant au transfert référencé <strong>{{ $transfer->reference }}</strong>,
        initialement déposée au bureau de <strong>{{ $transfer->origin_region }}</strong>.
    </div>

    {{-- Signatures --}}
    <table class="signatures">
        <tr>
            <td>
                <div class="sig-line">Signature du Client (Retrait)</div>
            </td>
            <td>
                <div class="sig-line">Signature de l'Agent (Retrait)</div>
            </td>
        </tr>
    </table>

    {{-- Footer --}}
    <div class="footer">
        <div class="footer-brand">TNT Cargo — Service de Transfert</div>
        <div>Document de finalisation — Réf: {{ $transfer->reference }} | Code: {{ $transfer->transfer_code }}</div>
        <div>Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
