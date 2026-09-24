<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quotation {{ $quotation->quotation_number }}</title>
    <style>
        @page { size: A4; margin: 16mm; }
        body { font-family: DejaVu Sans, sans-serif; color: #142033; font-size: 10px; }
        h1 { color: #123c69; margin: 22px 0 4px; }
        .muted { color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #123c69; color: white; text-align: left; padding: 8px; }
        td { border-bottom: 1px solid #dbe5ef; padding: 8px; vertical-align: top; }
        .right { text-align: right; }
        .total { font-size: 13px; font-weight: bold; color: #123c69; }
    </style>
</head>
<body>
    <strong>{{ $company['name'] }}</strong><br>
    <span class="muted">{{ $company['address'] }}<br>{{ $company['phone'] }} · {{ $company['email'] }}</span>
    <h1>Quotation</h1>
    <div class="muted">{{ $quotation->quotation_number }} · Valid until {{ $quotation->valid_until?->format('M d, Y') }}</div>
    <p><strong>Prepared for:</strong> {{ $quotation->client_name }}@if($quotation->client_company) · {{ $quotation->client_company }}@endif<br>
        {{ $quotation->client_email }}@if($quotation->client_contact) · {{ $quotation->client_contact }}@endif</p>
    @if($quotation->service_name)<p><strong>Service:</strong> {{ $quotation->service_name }}</p>@endif
    @if($quotation->travel_date)<p><strong>Travel date:</strong> {{ $quotation->travel_date->format('M d, Y') }}</p>@endif
    <table>
        <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
        <tbody>
        @foreach($quotation->line_items as $line)
            <tr><td>{{ $line['description'] }}</td><td class="right">{{ $line['quantity'] }}</td><td class="right">PHP {{ number_format($line['unit_price'], 2) }}</td><td class="right">PHP {{ number_format($line['amount'], 2) }}</td></tr>
        @endforeach
        <tr><td colspan="3" class="right">Subtotal</td><td class="right">PHP {{ number_format($quotation->subtotal, 2) }}</td></tr>
        <tr><td colspan="3" class="right">VAT ({{ number_format($quotation->vat_rate, 2) }}%)</td><td class="right">PHP {{ number_format($quotation->vat_amount, 2) }}</td></tr>
        <tr><td colspan="3" class="right total">Total</td><td class="right total">PHP {{ number_format($quotation->total, 2) }}</td></tr>
        </tbody>
    </table>
    @if($quotation->inclusions)<p><strong>Inclusions</strong><br>{!! nl2br(e($quotation->inclusions)) !!}</p>@endif
    @if($quotation->exclusions)<p><strong>Exclusions</strong><br>{!! nl2br(e($quotation->exclusions)) !!}</p>@endif
    @if($quotation->notes)<p><strong>Notes</strong><br>{!! nl2br(e($quotation->notes)) !!}</p>@endif
    <p class="muted">This quotation is subject to availability and confirmation.</p>
</body>
</html>
