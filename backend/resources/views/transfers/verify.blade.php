<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification de Transfert — TNT Cargo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 480px; width: 100%; overflow: hidden; }
        .header { background: #1e40af; color: #fff; padding: 24px; text-align: center; }
        .header h1 { font-size: 20px; font-weight: 700; }
        .header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
        .body { padding: 24px; }
        .status-banner { text-align: center; padding: 14px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; font-size: 14px; }
        .status-valid { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .status-invalid { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .info-grid { display: grid; gap: 12px; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
        .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
        .info-value { font-size: 14px; color: #111827; font-weight: 600; text-align: right; }
        .amount-highlight { font-size: 24px; font-weight: 700; color: #059669; text-align: center; padding: 16px; background: #ecfdf5; border-radius: 8px; border: 2px solid #059669; margin: 16px 0; }
        .route-box { text-align: center; padding: 12px; margin: 12px 0; }
        .route-box span { display: inline-block; padding: 6px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-weight: 600; color: #1e40af; font-size: 14px; }
        .route-arrow { padding: 0 10px; color: #9ca3af; font-size: 18px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .badge-pending_approval { background: #fef3c7; color: #92400e; }
        .badge-approved { background: #dbeafe; color: #1e40af; }
        .badge-completed { background: #d1fae5; color: #065f46; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }
        .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        .footer strong { color: #1e40af; }
        .icon-check { display: inline-block; width: 48px; height: 48px; background: #d1fae5; border-radius: 50%; line-height: 48px; font-size: 24px; margin-bottom: 8px; }
        .icon-x { display: inline-block; width: 48px; height: 48px; background: #fee2e2; border-radius: 50%; line-height: 48px; font-size: 24px; margin-bottom: 8px; }
    </style>
</head>
<body>
<div class="card">
    <div class="header">
        <h1>TNT Cargo</h1>
        <p>Vérification de Transfert</p>
    </div>

    <div class="body">
        @if($transfer)
            <div class="status-banner status-valid">
                <div class="icon-check">✓</div>
                <div>Transfert Vérifié — Authentique</div>
            </div>

            <div class="amount-highlight">
                {{ number_format($transfer->amount, 2, ',', ' ') }} {{ $transfer->currency }}
            </div>

            <div class="route-box">
                <span>{{ $transfer->origin_region }}</span>
                <span class="route-arrow">→</span>
                <span>{{ $transfer->destination_region }}</span>
            </div>

            <div class="info-grid">
                <div class="info-row">
                    <span class="info-label">Référence</span>
                    <span class="info-value">{{ $transfer->reference }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Code de Transfert</span>
                    <span class="info-value">{{ $transfer->transfer_code }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Client</span>
                    <span class="info-value">{{ $transfer->client_name }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Statut</span>
                    <span class="info-value">
                        <span class="status-badge badge-{{ $transfer->status }}">
                            {{ str_replace('_', ' ', $transfer->status) }}
                        </span>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date de Création</span>
                    <span class="info-value">{{ $transfer->created_at?->format('d/m/Y à H:i') }}</span>
                </div>
                @if($transfer->creator)
                <div class="info-row">
                    <span class="info-label">Créé par</span>
                    <span class="info-value">{{ $transfer->creator->name }}</span>
                </div>
                @endif
                @if($transfer->approver)
                <div class="info-row">
                    <span class="info-label">Approuvé par</span>
                    <span class="info-value">{{ $transfer->approver->name }} — {{ $transfer->approved_at?->format('d/m/Y') }}</span>
                </div>
                @endif
                @if($transfer->completer)
                <div class="info-row">
                    <span class="info-label">Complété par</span>
                    <span class="info-value">{{ $transfer->completer->name }} — {{ $transfer->completed_at?->format('d/m/Y') }}</span>
                </div>
                @endif
            </div>
        @else
            <div class="status-banner status-invalid">
                <div class="icon-x">✗</div>
                <div>Code QR Invalide</div>
            </div>
            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 12px;">
                Ce code QR ne correspond à aucun transfert enregistré dans notre système.
                <br><br>
                Veuillez vérifier que vous avez scanné le bon code ou contacter le service client.
            </p>
        @endif
    </div>

    <div class="footer">
        <strong>TNT Cargo</strong> — Service de Transfert & Procurement<br>
        Document vérifié le {{ now()->format('d/m/Y à H:i') }}
    </div>
</div>
</body>
</html>
