<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Cash Advance</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; }
        .container { padding: 30px; }
        .header { margin-bottom: 30px; border-bottom: 3px solid #1E40AF; padding-bottom: 15px; }
        .title { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .subtitle { font-size: 11px; color: #666; margin-top: 5px; }
        .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .summary-table td { padding: 12px 15px; text-align: center; width: 25%; }
        .summary-table .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
        .summary-table .value { font-size: 22px; font-weight: bold; margin-top: 5px; }
        .green { color: #059669; }
        .red { color: #DC2626; }
        .amber { color: #D97706; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .data-table th { background: #1E40AF; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        .data-table td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        .data-table tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="title">TNT Cargo — Rapport Cash Advance</div>
        <div class="subtitle">Généré le {{ now()->format('d/m/Y H:i') }}</div>
    </div>
    <table class="summary-table">
        <tr>
            <td><div class="label">Total Avancé</div><div class="value">${{ number_format($totalAdvanced, 2, ',', ' ') }}</div></td>
            <td><div class="label">Total Récupéré</div><div class="value green">${{ number_format($totalRecovered, 2, ',', ' ') }}</div></td>
            <td><div class="label">Encours</div><div class="value red">${{ number_format($outstanding, 2, ',', ' ') }}</div></td>
            <td><div class="label">En Retard</div><div class="value amber">{{ $overdueCount }}</div></td>
        </tr>
    </table>
    @if($trend->count() > 0)
    <table class="data-table">
        <thead><tr><th>Date</th><th>Avancé</th><th>Récupéré</th></tr></thead>
        <tbody>
        @foreach($trend as $row)
            <tr>
                <td>{{ $row->date }}</td>
                <td>${{ number_format($row->advanced, 2, ',', ' ') }}</td>
                <td class="green">${{ number_format($row->recovered, 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif
    <div class="footer">TNT Cargo — Rapport confidentiel</div>
</div>
</body>
</html>
