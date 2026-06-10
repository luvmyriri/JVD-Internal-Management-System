<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Statement of Account</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1e293b; margin: 0; padding: 24px 28px; font-size: 11px; line-height: 1.6; background: #fff; }

        /* ─── Header ─── */
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        .header-left  { width: 60%; vertical-align: top; }
        .header-right { width: 40%; text-align: right; vertical-align: top; }
        .company-logo { font-size: 16px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; margin-bottom: 4px; }
        .company-sub  { font-size: 8.5px; color: #64748b; line-height: 1.6; }
        
        /* ─── Document Title Bar ─── */
        .title-bar { background: #1e3a8a; color: #fff; text-align: center; padding: 10px; border-radius: 4px; font-size: 13px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 22px; }

        /* ─── Info Grid ─── */
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-box   { width: 50%; vertical-align: top; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
        .info-label { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.6px; margin-bottom: 2px; }
        .info-value { font-size: 12px; font-weight: 900; color: #0f172a; }
        .info-sub   { font-size: 9px; color: #64748b; margin-top: 1px; }

        /* ─── Service Items Table ─── */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table thead tr { background: #f1f5f9; }
        .items-table th { padding: 9px 10px; text-align: left; font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
        .items-table td { padding: 11px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 10.5px; }
        .items-table tbody tr:last-child td { border-bottom: none; }
        .items-table .num { text-align: right; }
        .service-name { font-weight: 700; color: #0f172a; }
        .service-cat  { font-size: 8.5px; color: #64748b; margin-top: 2px; }

        /* ─── Payments History ─── */
        .payments-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .payments-table th { padding: 8px 10px; text-align: left; font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #475569; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; }
        .payments-table td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
        .payments-table .amount-cell { text-align: right; font-weight: 700; color: #16a34a; }

        /* ─── Status Badge ─── */
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-partial { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
        .badge-pending { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .badge-paid    { background: #dcfce7; color: #166534; border: 1px solid #86efac; }

        /* ─── Financial Summary ─── */
        .summary-wrapper { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-bottom: 28px; }
        .summary-row { display: table; width: 100%; margin-bottom: 7px; }
        .summary-label { display: table-cell; font-weight: 600; color: #475569; font-size: 10.5px; }
        .summary-value { display: table-cell; text-align: right; font-weight: 900; color: #0f172a; font-size: 10.5px; }
        .summary-divider { border: none; border-top: 1px dashed #cbd5e1; margin: 8px 0; }
        .summary-balance-row { background: #fef2f2; border-radius: 4px; padding: 8px 10px; display: table; width: 100%; margin-top: 6px; }
        .summary-balance-label { display: table-cell; font-weight: 900; color: #991b1b; font-size: 11px; }
        .summary-balance-value { display: table-cell; text-align: right; font-weight: 900; color: #dc2626; font-size: 14px; }
        .summary-paid-row { display: table; width: 100%; margin-top: 4px; padding: 6px 10px; background: #dcfce7; border-radius: 4px; }
        .summary-paid-label { display: table-cell; font-weight: 900; color: #166534; font-size: 10.5px; }
        .summary-paid-value { display: table-cell; text-align: right; font-weight: 900; color: #16a34a; font-size: 12px; }

        /* ─── Notice Block ─── */
        .notice { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 10px 14px; border-radius: 0 4px 4px 0; margin-bottom: 24px; }
        .notice strong { color: #92400e; display: block; font-size: 10px; margin-bottom: 3px; }
        .notice p { margin: 0; color: #78350f; font-size: 9.5px; }

        /* ─── Footer ─── */
        .footer { border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 36px; font-size: 9px; color: #64748b; }
        .footer-table { width: 100%; border-collapse: collapse; }
        .footer-left  { width: 50%; vertical-align: top; }
        .footer-right { width: 50%; text-align: right; vertical-align: top; }
        .section-title { font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    </style>
</head>
<body>

    @php
        $isPartial = in_array($invoice->status, ['partial', 'downpayment']);
        $isPaid    = $invoice->status === 'paid';
        $hasItems  = isset($invoice->items) && $invoice->items && $invoice->items->count() > 0;
        $docTitle  = $isPaid ? 'OFFICIAL RECEIPT' : 'STATEMENT OF ACCOUNTS';
        $statusLabel = $isPaid ? 'paid' : ($isPartial ? 'partial' : 'pending');

        // Collection-specific fields
        $serviceType    = $invoice->service_type ?? null;
        $serviceLabel   = ($serviceType === 'Other' ? ($invoice->other_service_type ?? 'Other Service') : $serviceType) ?? 'General Service';
        $paymentHistory = $invoice->payments ?? collect([]);
        $travelDate     = isset($invoice->travel_date) ? $invoice->travel_date : ($invoice->due_date ?? null);
    @endphp

    {{-- ── HEADER ── --}}
    <table class="header-table">
        <tr>
            <td class="header-left">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 55px; vertical-align: middle; padding-right: 10px;">
                            <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" style="height: 48px; width: auto;" alt="JVD Logo">
                        </td>
                        <td style="vertical-align: middle;">
                            <div class="company-logo" style="margin: 0; line-height: 1.1; font-size: 16px; font-weight: 950; color: #1e3a8a;">JVD Event &amp; Travel</div>
                            <div style="font-size: 9px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px;">Management Company</div>
                        </td>
                    </tr>
                </table>
                <div class="company-sub" style="margin-top: 8px;">
                    Reg No: 912-883-911-000<br>
                    UNIT 6 - Aryanna Village Center Brgy 175 Susano Road,<br>
                    Camarin, Caloocan City<br>
                    Phone: 0976 471 1294 &nbsp;|&nbsp; Tel: 02 8293 8068
                </div>
            </td>
            <td class="header-right">
                <div style="font-size: 9px; color: #64748b;">Statement Date</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-bottom: 8px;">{{ now()->format('F d, Y') }}</div>
                <div style="font-size: 9px; color: #64748b;">Reference No.</div>
                <div style="font-size: 13px; font-weight: 900; color: #1e3a8a;">{{ $invoice->invoice_number }}</div>
                <div style="margin-top: 6px;">
                    <span class="badge badge-{{ $statusLabel }}">{{ strtoupper($statusLabel) }}</span>
                </div>
            </td>
        </tr>
    </table>

    {{-- ── TITLE BAR ── --}}
    <div class="title-bar">{{ $docTitle }}</div>

    {{-- ── BILL TO / SERVICE INFO ── --}}
    <table class="info-table">
        <tr>
            <td class="info-box" style="border-radius: 4px 0 0 4px; border-right: none;">
                <div class="info-label">Bill To</div>
                <div class="info-value">{{ $invoice->customer_name }}</div>
                @if($invoice->customer_address)
                    <div class="info-sub">{{ $invoice->customer_address }}</div>
                @endif
                @if($invoice->customer_email)
                    <div class="info-sub">{{ $invoice->customer_email }}</div>
                @endif
                @if($invoice->customer_contact)
                    <div class="info-sub">{{ $invoice->customer_contact }}</div>
                @endif
            </td>
            <td class="info-box" style="border-radius: 0 4px 4px 0;">
                <div class="info-label">Payment Terms</div>
                <div class="info-value">Due on Service Date</div>
                @if($travelDate)
                    <div class="info-sub">Service / Travel Date: {{ \Carbon\Carbon::parse($travelDate)->format('M d, Y') }}</div>
                @endif
                @if(!$isPaid)
                    <div class="info-sub" style="color: #dc2626; font-weight: 700; margin-top: 4px;">BALANCE DUE: &#8369;{{ number_format($invoice->balance, 2) }}</div>
                @endif
            </td>
        </tr>
    </table>

    @if($invoice->travel_date || $invoice->bus_id || $invoice->driver_id || $invoice->tour_code || $invoice->pickup_location || $invoice->pax_count)
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px 14px; margin-bottom: 20px; font-size: 10px;">
        <div style="font-size: 8px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">Travel &amp; Assignment Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr>
                @if($invoice->travel_date)
                <td style="width: 33.3%; padding: 3px 0; vertical-align: top;"><strong>Travel Date:</strong> {{ \Carbon\Carbon::parse($invoice->travel_date)->format('F d, Y') }}</td>
                @endif
                @if($invoice->tour_code)
                <td style="width: 33.3%; padding: 3px 0; vertical-align: top;"><strong>Tour/Joiner Code:</strong> {{ $invoice->tour_code }}</td>
                @endif
                @if($invoice->pax_count)
                <td style="width: 33.3%; padding: 3px 0; vertical-align: top;"><strong>Pax Count:</strong> {{ $invoice->pax_count }} Pax</td>
                @endif
            </tr>
            @if($invoice->pickup_location)
            <tr>
                <td colspan="3" style="padding: 3px 0; vertical-align: top;"><strong>Pickup Location:</strong> {{ $invoice->pickup_location }}</td>
            </tr>
            @endif
            @if($invoice->bus_id || $invoice->driver_id)
            <tr>
                @if($invoice->bus)
                <td style="padding: 3px 0; vertical-align: top;"><strong>Bus Assigned:</strong> {{ $invoice->bus->plate_number }} ({{ $invoice->bus->model }})</td>
                @endif
                @if($invoice->driver)
                <td style="padding: 3px 0; vertical-align: top;"><strong>Driver:</strong> {{ $invoice->driver->first_name }} {{ $invoice->driver->last_name }}</td>
                @endif
                @if($invoice->seat_map && count($invoice->seat_map) > 0)
                <td style="padding: 3px 0; vertical-align: top;"><strong>Selected Seats:</strong> {{ implode(', ', $invoice->seat_map) }}</td>
                @endif
            </tr>
            @endif
        </table>
    </div>
    @endif

    {{-- ── SERVICES / ITEMS TABLE ── --}}
    <div class="section-title">Services Rendered</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Description</th>
                <th style="width: 20%;">Date Issued</th>
                <th style="width: 15%; text-align: center;">Status</th>
                <th style="width: 15%; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            @if($hasItems)
                @foreach($invoice->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <div class="service-name">{{ $item->service ? $item->service->name : ($item->custom_service_name ?? 'N/A') }}</div>
                        <div class="service-cat">{{ $item->service ? $item->service->category : 'Custom Service' }}</div>
                    </td>
                    <td>{{ $invoice->created_at ? \Carbon\Carbon::parse($invoice->created_at)->format('M d, Y') : 'N/A' }}</td>
                    <td style="text-align: center;">
                        <span class="badge badge-{{ $statusLabel }}">{{ strtoupper($statusLabel) }}</span>
                    </td>
                    <td class="num" style="font-weight: 700;">&#8369;{{ number_format($item->total_price, 2) }}</td>
                </tr>
                @endforeach
            @else
                {{-- Standalone collection (no linked invoice items) --}}
                <tr>
                    <td>1</td>
                    <td>
                        <div class="service-name">{{ $serviceLabel }}</div>
                        <div class="service-cat">
                            @if($invoice->pick_up ?? false)Pickup: {{ $invoice->pick_up }} → {{ $invoice->drop_off ?? '' }}@endif
                        </div>
                    </td>
                    <td>{{ $invoice->created_at ? \Carbon\Carbon::parse($invoice->created_at)->format('M d, Y') : now()->format('M d, Y') }}</td>
                    <td style="text-align: center;">
                        <span class="badge badge-{{ $statusLabel }}">{{ strtoupper($statusLabel) }}</span>
                    </td>
                    <td class="num" style="font-weight: 700;">&#8369;{{ number_format($invoice->total_amount, 2) }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    {{-- ── PAYMENT HISTORY ── --}}
    @if(isset($paymentHistory) && $paymentHistory->count() > 0)
    <div class="section-title">Payment History</div>
    <table class="payments-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 30%;">Date</th>
                <th style="width: 35%;">Method</th>
                <th style="width: 30%; text-align: right;">Amount Paid</th>
            </tr>
        </thead>
        <tbody>
            @foreach($paymentHistory as $i => $payment)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ \Carbon\Carbon::parse($payment->payment_date)->format('M d, Y') }}</td>
                <td>{{ $payment->payment_method }}</td>
                <td class="amount-cell">&#8369;{{ number_format($payment->amount, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- ── FINANCIAL SUMMARY ── --}}
    <div class="summary-wrapper">
        <div class="summary-row">
            <div class="summary-label">Invoice Total:</div>
            <div class="summary-value">&#8369;{{ number_format($invoice->total_amount, 2) }}</div>
        </div>
        @if(isset($invoice->tax_amount) && $invoice->tax_amount > 0)
        <div class="summary-row">
            <div class="summary-label">VAT (12%) Included:</div>
            <div class="summary-value">&#8369;{{ number_format($invoice->tax_amount, 2) }}</div>
        </div>
        @endif
        <hr class="summary-divider">
        <div class="summary-paid-row">
            <div class="summary-paid-label">Total Amount Paid:</div>
            <div class="summary-paid-value">&#8369;{{ number_format($invoice->amount_received, 2) }}</div>
        </div>
        @if(!$isPaid)
        <div class="summary-balance-row" style="margin-top: 8px;">
            <div class="summary-balance-label">Outstanding Balance:</div>
            <div class="summary-balance-value">&#8369;{{ number_format($invoice->balance, 2) }}</div>
        </div>
        @else
        <div style="text-align: center; margin-top: 10px; color: #166534; font-weight: 900; font-size: 12px;">✔ ACCOUNT FULLY SETTLED</div>
        @endif
    </div>

    {{-- ── NOTICE (unpaid only) ── --}}
    @if(!$isPaid)
    <div class="notice">
        <strong>Outstanding Balance Notice</strong>
        <p>Please settle your remaining balance of <strong>&#8369;{{ number_format($invoice->balance, 2) }}</strong> on or before the scheduled service date. Failure to settle may result in cancellation of services.</p>
    </div>
    @endif

    {{-- ── FOOTER ── --}}
    <div class="footer">
        <table class="footer-table">
            <tr>
                <td class="footer-left">
                    <strong>Bank Transfer:</strong><br>
                    UnionBank of the Philippines<br>
                    Account Name: JVD Event and Travel Management Company<br>
                    Account Number: 1029-4829-1928<br><br>
                    <strong>GCash:</strong> 0976 471 1294
                </td>
                <td class="footer-right">
                    <strong>For inquiries:</strong><br>
                    accounts@jvd-travel.com<br>
                    02 8293 8068<br><br>
                    <em>This is a computer-generated document.</em><br>
                    <em>No signature is required.</em>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
