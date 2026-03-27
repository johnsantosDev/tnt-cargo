<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Expéditions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; }
        .container { padding: 30px; }
        .header { margin-bottom: 30px; border-bottom: 3px solid #1E40AF; padding-bottom: 15px; }
        .title { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 11px; color: #666; margin-top: 5px; }
        .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .summary-table td { padding: 12px 15px; text-align: center; width: 33%; }
        .summary-table .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
        .summary-table .value { font-size: 22px; font-weight: bold; margin-top: 5px; }
        .section-title { font-size: 14px; font-weight: bold; color: #1E40AF; margin: 20px 0 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .data-table th { background: #1E40AF; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        .data-table td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="title">TNT Cargo — Rapport Expéditions</div>
        <div class="subtitle">Généré le {{ now()->format('d/m/Y H:i') }}</div>
    </div>
    <table class="summary-table">
        <tr>
            <td><div class="label">Total Expéditions</div><div class="value">{{ $total }}</div></td>
            <td><div class="label">Livrées</div><div class="value" style="color:#059669">{{ $delivered }}</div></td>
            <td><div class="label">En Transit</div><div class="value" style="color:#2563EB">{{ $inTransit }}</div></td>
        </tr>
    </table>
    <div class="section-title">Par Statut</div>
    <table class="data-table">
        <thead><tr><th>Statut</th><th>Nombre</th></tr></thead>
        <tbody>
        @foreach($byStatus as $s)
            <tr><td>{{ $s->name }}</td><td>{{ $s->count }}</td></tr>
        @endforeach
        </tbody>
    </table>
    <div class="section-title">Par Origine</div>
    <table class="data-table">
        <thead><tr><th>Origine</th><th>Nombre</th></tr></thead>
        <tbody>
        @foreach($byOrigin as $o)
            <tr><td>{{ $o->origin }}</td><td>{{ $o->count }}</td></tr>
        @endforeach
        </tbody>
    </table>
    <div class="footer">TNT Cargo — Rapport confidentiel</div>
</div>
</body>
</html>
