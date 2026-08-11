<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sales Quotation</title>
    <style>
        @page { size: A4; margin: 12mm 14mm 22mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #142033; font-family: DejaVu Sans, sans-serif; font-size: 9px; }
        .party { width: 100%; margin: 12px 0 16px; border-collapse: collapse; background: #f1f6fb; }
        .party td { padding: 8px; border: 1px solid #dbe5ef; vertical-align: top; }
        .label { display: block; margin-bottom: 3px; color: #607087; font-size: 7px; font-weight: 900; text-transform: uppercase; }
        .items { width: 100%; border-collapse: collapse; }
        .items th { padding: 7px 5px; background: #123c69; color: white; font-size: 8px; text-align: left; text-transform: uppercase; }
        .items td { padding: 8px 5px; border-bottom: 1px solid #dbe5ef; vertical-align: top; }
        .right { text-align: right !important; }
        .totals { width: 42%; margin: 14px 0 0 auto; border-collapse: collapse; }
        .totals td { padding: 5px; }
        .total { border-top: 2px solid #123c69; color: #123c69; font-size: 12px; font-weight: 900; }
        .terms { margin-top: 20px; padding: 10px; border: 1px solid #dbe5ef; color: #4b5e73; line-height: 1.6; }
        @include('pdf.partials.brand-styles')
    </style>
</head>
<body>
@include('pdf.partials.brand-header', ['documentTitle' => 'Sales Quotation', 'documentReference' => $order->order_number, 'documentDate' => $order->created_at])
@include('pdf.partials.brand-footer', ['footerNote' => 'Quotation generated from the recorded Sales transaction. Final availability remains subject to confirmation.'])
<table class="party"><tr><td><span class="label">Prepared for</span><strong>{{ $order->invoice?->customer_name ?? $order->customer?->full_name ?? 'Customer' }}</strong><br>{{ $order->invoice?->customer_email }}<br>{{ $order->invoice?->customer_contact }}</td><td><span class="label">Reference</span>{{ $order->order_number }}<br><span class="label" style="margin-top:6px">Travel period</span>{{ $order->travel_starts_at?->format('M d, Y') ?: 'To be agreed' }} @if($order->travel_ends_at) to {{ $order->travel_ends_at->format('M d, Y') }} @endif</td></tr></table>
<table class="items"><thead><tr><th>#</th><th>Travel service</th><th>Schedule / travelers</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>
@foreach($order->items as $index => $item)
<tr><td>{{ $index + 1 }}</td><td><strong>{{ $item->title }}</strong><br><span style="color:#607087">{{ $item->description }}</span></td><td>{{ $item->scheduled_start?->format('M d, Y h:i A') ?: 'As agreed' }}<br>{{ $item->traveler_count ? $item->traveler_count.' traveler(s)' : '' }}</td><td class="right">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td><td class="right">&#8369;{{ number_format($item->unit_price, 2) }}</td><td class="right"><strong>&#8369;{{ number_format($item->subtotal, 2) }}</strong></td></tr>
@endforeach
</tbody></table>
<table class="totals"><tr><td>Subtotal</td><td class="right">&#8369;{{ number_format($order->subtotal, 2) }}</td></tr><tr><td>VAT</td><td class="right">&#8369;{{ number_format($order->tax_amount, 2) }}</td></tr><tr class="total"><td>Total</td><td class="right">&#8369;{{ number_format($order->total_amount, 2) }}</td></tr></table>
<div class="terms"><strong>Commercial notes</strong><br>This quotation reflects the service configuration, schedule, passenger count, and rates recorded in Sales. Vehicle, driver, seat, supplier, and venue availability must be reconfirmed before travel. Any approved changes must be recorded through the transaction lifecycle.</div>
</body>
</html>
