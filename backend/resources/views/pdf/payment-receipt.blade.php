<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payment Receipt</title>
    <style>
        @page { size: A4; margin: 14mm 15mm 22mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #172033; font-family: 'DejaVu Sans', sans-serif; font-size: 9px; line-height: 1.4; }
        table { width: 100%; border-collapse: collapse; }
        .header { border-bottom: 3px solid #173b68; margin-bottom: 12px; }
        .header td { padding: 0 0 9px; vertical-align: top; }
        .brand { color: #173b68; font-size: 15px; font-weight: 900; }
        .company-copy { color: #526277; font-size: 8px; margin-top: 2px; }
        .title { color: #173b68; font-size: 16px; font-weight: 900; letter-spacing: 1px; text-align: right; }
        .title-sub { color: #64748b; font-size: 8px; font-weight: normal; letter-spacing: 0; }
        .details { margin-bottom: 12px; }
        .details td { width: 50%; padding: 7px 9px; border: 1px solid #dce5ef; background: #f7faff; vertical-align: top; }
        .label { display: block; margin-bottom: 2px; color: #64748b; font-size: 7px; font-weight: 900; letter-spacing: .6px; text-transform: uppercase; }
        .section-title { margin: 12px 0 5px; color: #173b68; font-size: 8px; font-weight: 900; letter-spacing: .7px; text-transform: uppercase; }
        .items thead { display: table-header-group; }
        .items th { padding: 5px 6px; border-bottom: 2px solid #91a4ba; background: #edf3f8; color: #45576d; font-size: 7px; text-align: left; text-transform: uppercase; }
        .items td { padding: 5px 6px; border-bottom: 1px solid #e1e8f0; vertical-align: top; }
        .items .qty { text-align: center; }
        .items .money { text-align: right; white-space: nowrap; }
        .item-name { color: #111c2e; font-weight: 900; }
        .item-meta { margin-top: 1px; color: #64748b; font-size: 7.5px; }
        .joiner { margin-top: 9px; padding: 7px 9px; border-left: 3px solid #2563a7; background: #f4f8fc; color: #34465b; }
        .joiner strong { color: #173b68; }
        .summary { width: 48%; margin: 12px 0 0 auto; }
        .summary td { padding: 5px 0; border-bottom: 1px solid #e3e9f0; }
        .summary .amount { font-weight: 900; text-align: right; white-space: nowrap; }
        .summary .total td { padding-top: 7px; border-top: 2px solid #173b68; color: #173b68; font-size: 11px; }
        .note { margin-top: 15px; padding: 8px 10px; border-left: 3px solid #17844b; background: #effaf3; color: #245637; }
        .footer { margin-top: 24px; padding-top: 7px; border-top: 1px solid #cbd6e1; color: #64748b; font-size: 7.5px; }
        body > .header, body > .footer { display: none; }
        @include('pdf.partials.brand-styles')
    </style>
</head>
<body>
    @php
        $joiner = $invoice->joinerReservation;
        $departure = $joiner?->departure;
        $seatAssignments = $joiner?->passengers?->map(fn ($passenger) =>
            ($passenger->seat?->seat_code ?: '?').' - '.trim($passenger->first_name.' '.$passenger->last_name)
            .($passenger->passenger_type === 'child' ? ' (Child)' : '')
        )->filter()->values()->all() ?? [];
    @endphp

    @include('pdf.partials.brand-header', ['documentTitle' => 'Payment Receipt', 'documentReference' => $invoice->invoice_number, 'documentDate' => $invoice->updated_at ?? $invoice->created_at])
    @include('pdf.partials.brand-footer', ['footerNote' => 'Official payment receipt. Retain this document with the corresponding invoice for your records.'])

    <table class="header">
        <tr>
            <td>
                <div class="brand">{{ $company['name'] }}</div>
                <div class="company-copy">{{ $company['address'] }}<br>{{ $company['phone'] }} | {{ $company['email'] }}</div>
            </td>
            <td class="title">
                PAYMENT RECEIPT<br>
                <span class="title-sub">Invoice {{ $invoice->invoice_number }}</span>
            </td>
        </tr>
    </table>

    <table class="details">
        <tr>
            <td>
                <span class="label">Received from</span>
                <strong>{{ $invoice->customer_name }}</strong><br>
                {{ $invoice->customer_contact ?: 'Contact not recorded' }}<br>
                {{ $invoice->customer_email ?: 'Email not recorded' }}
            </td>
            <td>
                <span class="label">Payment status</span>
                <strong>{{ strtoupper($invoice->status) }}</strong><br>
                <span class="label" style="margin-top: 6px;">Payment method / type</span>
                @php
                    $effectivePaymentMethod = $invoice->collection?->payments?->last()?->payment_method 
                        ?? $invoice->educationalTourParticipantBooking?->payments?->last()?->payment_method 
                        ?? $invoice->payment_method 
                        ?? 'Cash';
                @endphp
                {{ strtoupper($effectivePaymentMethod) }} / {{ strtoupper($invoice->payment_type ?: 'FULL') }}
                @if($invoice->payment_id)<br>Reference: {{ $invoice->payment_id }}@endif
            </td>
        </tr>
        <tr>
            <td><span class="label">Invoice issued</span>{{ $invoice->created_at?->format('M d, Y h:i A') }}</td>
            <td><span class="label">Receipt generated</span>{{ $generatedAt->format('M d, Y h:i A') }}</td>
        </tr>
    </table>

    <div class="section-title">Services covered by this payment</div>
    <table class="items">
        <thead>
            <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 52%;">Service</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 16%; text-align: right;">Unit price</th>
                <th style="width: 16%; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse($invoice->items as $index => $item)
                @php
                    $itemName = $item->item_name ?? $item->service?->name ?? 'Travel service';
                    $itemDescription = $item->item_description ?? $item->service?->description;
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <div class="item-name">{{ $itemName }}</div>
                        <div class="item-meta">
                            {{ str_replace('_', ' ', $item->service_type ?? $item->service?->service_type ?? $item->service?->category ?? 'Travel service') }}
                            @if($item->adults !== null || $item->children !== null)
                                | {{ (int) ($item->adults ?? 0) }} adult(s), {{ (int) ($item->children ?? 0) }} child(ren)
                            @endif
                        </div>
                        @if($itemDescription && trim($itemDescription) !== trim($itemName))
                            <div class="item-meta">{{ \Illuminate\Support\Str::limit($itemDescription, 120) }}</div>
                        @endif
                    </td>
                    <td class="qty">{{ $item->quantity }}</td>
                    <td class="money">PHP {{ number_format($item->unit_price, 2) }}</td>
                    <td class="money"><strong>PHP {{ number_format($item->total_price, 2) }}</strong></td>
                </tr>
            @empty
                <tr><td colspan="5">No service line items were recorded for this invoice.</td></tr>
            @endforelse
        </tbody>
    </table>

    @if($joiner && $departure)
        <div class="joiner">
            <strong>Joiner booking {{ $joiner->reference }} / {{ $departure->code }}</strong><br>
            Travel: {{ $departure->starts_at?->format('M d, Y h:i A') }} - {{ $departure->ends_at?->format('M d, Y h:i A') }}
            @if($seatAssignments)<br>Seat assignments: {{ implode('; ', $seatAssignments) }}@endif
        </div>
    @endif

    <table class="summary">
        <tr><td>Invoice total</td><td class="amount">PHP {{ number_format($invoice->total_amount, 2) }}</td></tr>
        <tr><td>Total payment received</td><td class="amount">PHP {{ number_format($invoice->amount_received ?? 0, 2) }}</td></tr>
        @if(($invoice->change ?? 0) > 0)
            <tr><td>Change given</td><td class="amount">PHP {{ number_format($invoice->change, 2) }}</td></tr>
        @endif
        <tr class="total"><td>Outstanding balance</td><td class="amount">PHP {{ number_format($invoice->balance ?? 0, 2) }}</td></tr>
    </table>

    <div class="note"><strong>Payment acknowledgement:</strong> This receipt acknowledges the amount recorded against the invoice above. Keep this receipt together with the official invoice for your records.</div>
    <div class="footer">System-generated payment receipt | {{ $company['name'] }} | Registration: {{ $company['registration'] }}</div>
</body>
</html>
