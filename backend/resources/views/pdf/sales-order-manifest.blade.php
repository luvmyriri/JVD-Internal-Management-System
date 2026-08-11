<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Passenger Manifest</title>
    <style>
        @page { size: A4; margin: 12mm 14mm 22mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #142033; font-family: DejaVu Sans, sans-serif; font-size: 9px; }
        .summary { width: 100%; margin: 12px 0; border-collapse: collapse; background: #f1f6fb; }
        .summary td { padding: 7px 8px; border: 1px solid #dbe5ef; vertical-align: top; }
        .label { display: block; margin-bottom: 2px; color: #607087; font-size: 7px; font-weight: 900; letter-spacing: .5px; text-transform: uppercase; }
        .roster { width: 100%; border-collapse: collapse; }
        .roster th { padding: 7px 5px; background: #123c69; color: #fff; font-size: 8px; text-align: left; text-transform: uppercase; }
        .roster td { padding: 7px 5px; border-bottom: 1px solid #dbe5ef; vertical-align: top; }
        .signatures { width: 100%; margin-top: 30px; border-collapse: collapse; }
        .signatures td { width: 33.33%; padding: 0 12px; text-align: center; }
        .line { padding-top: 4px; border-top: 1px solid #39495d; }
        @include('pdf.partials.brand-styles')
    </style>
</head>
<body>
@php
    $invoice = $order->invoice;
    $rows = collect();
    $push = function ($passenger, $source = null) use (&$rows) {
        $data = is_array($passenger)
            ? $passenger
            : (is_object($passenger) && method_exists($passenger, 'toArray')
                ? $passenger->toArray()
                : ['name' => (string) $passenger]);
        $name = trim(($data['first_name'] ?? '').' '.($data['last_name'] ?? ''));
        if (!$name && !empty($data['name'])) $name = trim($data['name']);
        if (!$name) return;
        $rows->push([
            'seat' => $data['seat_code'] ?? data_get($passenger, 'seat.seat_code') ?? '-',
            'name' => $name,
            'type' => ucfirst($data['passenger_type'] ?? $data['role'] ?? 'Passenger'),
            'contact' => $data['emergency_contact'] ?? '-',
            'notes' => $data['special_needs'] ?? $data['dietary_restrictions'] ?? '',
            'service' => $source,
        ]);
    };
    foreach ($invoice?->passengers ?? [] as $passenger) $push($passenger, 'Invoice roster');
    if ($rows->isEmpty() && $invoice?->joinerReservation) {
        foreach ($invoice->joinerReservation->passengers ?? [] as $passenger) $push($passenger, 'Joiner departure');
    }
    if ($rows->isEmpty() && $invoice?->charterBooking) {
        foreach ($invoice->charterBooking->passengers ?? [] as $passenger) $push($passenger, 'Bus charter');
    }
    if ($rows->isEmpty() && $invoice?->educationalTourBooking) {
        foreach ($invoice->educationalTourBooking->passengers ?? [] as $passenger) $push($passenger, 'Educational tour');
    }
    if ($rows->isEmpty()) {
        foreach ($order->items as $item) {
            $travelers = $item->fulfillment?->traveler_types
                ?? $item->fulfillment?->passengers
                ?? $item->fulfillment?->passenger_names
                ?? $item->fulfillment?->guest_names
                ?? $item->fulfillment?->participants
                ?? [];
            foreach (is_array($travelers) ? $travelers : [] as $passenger) $push($passenger, $item->title);
        }
    }
@endphp
@include('pdf.partials.brand-header', ['documentTitle' => 'Passenger Manifest', 'documentReference' => $order->order_number, 'documentDate' => $order->travel_starts_at ?? $order->created_at])
@include('pdf.partials.brand-footer', ['footerNote' => 'Confidential passenger information. Use only for the stated travel service.'])

<table class="summary">
    <tr>
        <td><span class="label">Transaction</span>{{ $order->order_number }}</td>
        <td><span class="label">Customer</span>{{ $invoice?->customer_name ?: 'Not recorded' }}</td>
        <td><span class="label">Invoice</span>{{ $invoice?->invoice_number ?: 'Not issued' }}</td>
    </tr>
    <tr>
        <td><span class="label">Travel period</span>{{ $order->travel_starts_at?->format('M d, Y h:i A') ?: 'To be scheduled' }}</td>
        <td><span class="label">Services</span>{{ $order->items->pluck('title')->filter()->implode(', ') }}</td>
        <td><span class="label">Named passengers</span>{{ $rows->count() }}</td>
    </tr>
</table>

<table class="roster">
    <thead><tr><th style="width:6%">#</th><th style="width:10%">Seat</th><th style="width:26%">Passenger</th><th style="width:12%">Type</th><th style="width:18%">Emergency contact</th><th>Service / Notes</th></tr></thead>
    <tbody>
    @forelse($rows as $index => $row)
        <tr><td>{{ $index + 1 }}</td><td><strong>{{ $row['seat'] }}</strong></td><td><strong>{{ $row['name'] }}</strong></td><td>{{ $row['type'] }}</td><td>{{ $row['contact'] }}</td><td>{{ collect([$row['service'], $row['notes']])->filter()->implode(' - ') }}</td></tr>
    @empty
        <tr><td colspan="6" style="padding:22px;text-align:center;color:#607087">No named passenger roster is linked to this transaction yet. Add the roster in Sales before operational sign-off.</td></tr>
    @endforelse
    </tbody>
</table>

<table class="signatures"><tr><td><div class="line">Prepared by</div></td><td><div class="line">Driver / Coordinator</div></td><td><div class="line">Operations approval</div></td></tr></table>
</body>
</html>
