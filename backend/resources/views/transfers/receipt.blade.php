<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Reçu de Transfert - {{ $transfer->reference }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        .container { padding: 24px; }
        .header { border-bottom: 3px solid #1e40af; margin-bottom: 16px; padding-bottom: 10px; }
        .header table { width: 100%; }
        .title { font-size: 22px; font-weight: bold; color: #1e40af; }
        .subtitle { font-size: 11px; color: #666; margin-top: 4px; }
        .muted { font-size: 10px; color: #888; }
        .section-title { font-size: 13px; font-weight: bold; color: #1e40af; margin: 16px 0 8px; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; }
        .info-box { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 12px 16px; margin-bottom: 14px; }
        .info-box table { width: 100%; }
        .info-box td { padding: 4px 8px; font-size: 11px; }
        .info-label { color: #555; font-weight: bold; width: 140px; }
        .info-value { color: #1e40af; font-weight: 600; }
        .amount-box { background: #ecfdf5; border: 2px solid #059669; border-radius: 6px; padding: 16px; text-align: center; margin: 16px 0; }
        .amount-value { font-size: 28px; font-weight: bold; color: #059669; }
        .amount-label { font-size: 11px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
        .code-box { background: #fefce8; border: 2px dashed #ca8a04; border-radius: 6px; padding: 12px; text-align: center; margin: 12px 0; }
        .code-value { font-size: 20px; font-weight: bold; color: #92400e; letter-spacing: 2px; }
        .code-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
        .qr-section { text-align: center; margin: 12px 0; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
        .qr-section .scan-text { font-size: 9px; color: #666; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .status-pending_approval { background: #fef3c7; color: #92400e; }
        .status-approved { background: #dbeafe; color: #1e40af; }
        .status-completed { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .route-box { text-align: center; margin: 12px 0; }
        .route-from, .route-to { display: inline-block; background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 8px 16px; font-weight: bold; color: #1e40af; }
        .route-arrow { display: inline-block; padding: 0 12px; font-size: 18px; color: #999; }
        .notice { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 4px; padding: 10px 14px; margin: 14px 0; font-size: 10px; color: #1e40af; }
        .signatures { margin-top: 30px; width: 100%; }
        .signatures td { padding: 8px 0; width: 50%; vertical-align: bottom; }
        .sig-line { border-top: 1px solid #999; width: 80%; margin-top: 30px; padding-top: 4px; font-size: 10px; color: #555; }
        .footer { margin-top: 24px; padding-top: 8px; border-top: 2px solid #1e40af; font-size: 9px; color: #888; text-align: center; }
        .footer-brand { font-size: 12px; font-weight: bold; color: #1e40af; }
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
                    <div class="subtitle">Service de Transfert — Procurement</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 18px; font-weight: bold; color: #1e40af;">REÇU DE TRANSFERT</div>
                    <div class="muted" style="margin-top: 4px;">{{ $transfer->reference }}</div>
                    <div style="margin-top: 6px;">
                        <span class="status-badge status-{{ $transfer->status }}">{{ strtoupper(str_replace('_', ' ', $transfer->status)) }}</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- Transfer Code --}}
    <div class="code-box">
        <div class="code-label">Code de Transfert — Présentez ce code au retrait</div>
        <div class="code-value">{{ $transfer->transfer_code }}</div>
    </div>

    {{-- Amount --}}
    <div class="amount-box">
        <div class="amount-label">Montant du Transfert</div>
        <div class="amount-value">{{ number_format($transfer->amount, 2, ',', ' ') }} {{ $transfer->currency }}</div>
        @if($transfer->transfer_fee > 0)
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #a7f3d0; font-size: 12px; color: #374151;">
            <span>Frais de transfert:</span>
            <strong>{{ number_format($transfer->transfer_fee, 2, ',', ' ') }} {{ $transfer->currency }}</strong>
        </div>
        <div style="margin-top: 4px; font-size: 13px; font-weight: bold; color: #065f46;">
            Total: {{ number_format($transfer->amount + $transfer->transfer_fee, 2, ',', ' ') }} {{ $transfer->currency }}
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
                <td class="info-label">Créé par</td>
                <td class="info-value">{{ $transfer->creator?->name ?? '—' }}</td>
                <td class="info-label">Date de création</td>
                <td class="info-value">{{ $transfer->created_at?->format('d/m/Y à H:i') }}</td>
            </tr>
            @if($transfer->approver)
            <tr>
                <td class="info-label">Approuvé par</td>
                <td class="info-value">{{ $transfer->approver->name }}</td>
                <td class="info-label">Date d'approbation</td>
                <td class="info-value">{{ $transfer->approved_at?->format('d/m/Y à H:i') }}</td>
            </tr>
            @endif
        </table>
    </div>

    {{-- Notes --}}
    @if($transfer->notes)
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; margin: 10px 0; font-size: 11px;">
        <strong>Notes:</strong> {{ $transfer->notes }}
    </div>
    @endif

    {{-- QR Code --}}
    <div class="qr-section">
        <div style="font-size: 10px; font-weight: bold; color: #333; margin-bottom: 4px;">VÉRIFICATION QR</div>
        <img src="{{ $qrBase64 }}" style="width: 90px; height: 90px;" alt="QR Code" />
        <div class="scan-text">Scannez pour vérifier l'authenticité de ce transfert</div>
    </div>

    {{-- Notice --}}
    <div class="notice">
        <strong>IMPORTANT:</strong> Ce reçu doit être présenté lors du retrait des fonds à la destination.
        Le transfert doit être approuvé par un manager avant qu'il puisse être complété.
        Le code de transfert et le QR code sont requis pour la vérification.
    </div>

    {{-- Signatures --}}
    <table class="signatures">
        <tr>
            <td>
                <div class="sig-line">Signature du Client (Dépôt)</div>
            </td>
            <td>
                <div class="sig-line">Signature de l'Agent (Dépôt)</div>
            </td>
        </tr>
    </table>

    {{-- Footer --}}
    <div class="footer">
        <div class="footer-brand">TNT Cargo — Service de Transfert</div>
        <div>Document confidentiel — Réf: {{ $transfer->reference }} | Code: {{ $transfer->transfer_code }}</div>
        <div>Généré le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</div>
</body>
</html>
