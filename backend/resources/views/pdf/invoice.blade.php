<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Official Invoice</title>
    <style>
        @page { size: A4; margin: 12mm 15mm; }
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1a1a1a; margin: 0; padding: 0; font-size: 10px; line-height: 1.4; }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .header-left { width: 60%; vertical-align: top; }
        .header-right { width: 40%; text-align: right; vertical-align: top; }
        .company-logo { font-size: 15px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; margin-bottom: 2px; }
        .doc-title { text-align: center; font-size: 13px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #1e293b; margin: 8px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #cbd5e1; }

        .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; font-size: 9px; }
        .details-title { font-size: 9px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 6px; }
        .details-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .details-table td { padding: 2px 0; vertical-align: top; }
        .details-label { font-weight: 900; color: #334155; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .items-table th { background: #f1f5f9; color: #475569; font-weight: 900; text-transform: uppercase; font-size: 8px; padding: 6px 5px; border-bottom: 2px solid #94a3b8; text-align: left; }
        .items-table td { padding: 5px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
        .items-table .item-name { font-weight: 900; color: #0f172a; }
        .items-table .item-sub { font-size: 8px; color: #64748b; font-weight: normal; margin-top: 1px; }
        .items-table .pax-row { font-size: 8px; color: #475569; margin-top: 2px; }
        .items-table .right { text-align: right; }
        .items-table .center { text-align: center; }

        .summary-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 10px; }
        .summary-col { width: 33.33%; vertical-align: top; padding: 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #f1f5f9; }
        .summary-title { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
        .summary-row { display: block; width: 100%; margin-bottom: 3px; clear: both; }
        .summary-label { float: left; font-weight: 700; color: #475569; font-size: 9px; }
        .summary-value { float: right; font-weight: 900; color: #0f172a; font-size: 9px; }

        .footer { width: 100%; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 10px; font-size: 8px; color: #64748b; }
        .footer-table { width: 100%; border-collapse: collapse; }
        .footer-left { width: 50%; vertical-align: top; }
        .footer-right { width: 50%; text-align: right; vertical-align: top; }
        .thank-you { text-align: center; font-size: 10px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td class="header-left">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 45px; vertical-align: middle; padding-right: 8px;">
                            <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" style="height: 42px; width: auto;" alt="JVD Logo">
                        </td>
                        <td style="vertical-align: middle;">
                            <div class="company-logo">JVD Event &amp; Travel</div>
                            <div style="font-size: 8px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">Management Company</div>
                        </td>
                    </tr>
                </table>
                <div style="margin-top: 5px; font-size: 8px; color: #475569; line-height: 1.3;">
                    Reg No: 912-883-911-000<br>
                    UNIT 6 - Aryanna Village Center Brgy 175 Susano Road,<br>
                    Camarin, Caloocan City<br>
                    Phone: 0976 471 1294 | Tel: 02 8293 8068
                </div>
            </td>
            <td class="header-right">
                <h3 style="margin: 0; color: #475569; font-size: 13px;">OFFICIAL INVOICE</h3>
                <div style="margin-top: 5px; font-weight: 900; color: #0f172a; font-size: 10px;">{{ $invoice->customer_name }}</div>
                <div style="font-size: 8px;">{{ $invoice->customer_address }}</div>
                <div style="font-size: 8px;">{{ $invoice->customer_email }}</div>
                <div style="margin-top: 5px; font-size: 9px; font-weight: 900;">Invoice #: {{ $invoice->invoice_number }}</div>
                <div style="font-size: 8px;">Date: {{ $invoice->created_at->format('M d, Y') }}</div>
            </td>
        </tr>
    </table>

    <div class="doc-title">Official Invoice</div>

    {{-- Travel & Assignment Details --}}
    @php
        $booking = $invoice->booking;
        $bus = $booking?->bus;
        $driver = $booking?->driver;
        $seatMap = $booking?->seat_map ?? [];
        $itineraries = $invoice->itineraries ?? collect();
    @endphp

    @if($booking && ($booking->travel_date || $bus || $driver || $booking->tour_code || $booking->pickup_location || $booking->pax_count))
    <div class="details-box">
        <div class="details-title">Travel &amp; Assignment Details</div>
        <table class="details-table">
            <tr>
                @if($booking->travel_date)
                <td style="width: 33.3%;"><span class="details-label">Travel Date:</span> {{ \Carbon\Carbon::parse($booking->travel_date)->format('F d, Y') }}</td>
                @endif
                @if($booking->tour_code)
                <td style="width: 33.3%;"><span class="details-label">Tour/Joiner Code:</span> {{ $booking->tour_code }}</td>
                @endif
                @if($booking->pax_count)
                <td style="width: 33.3%;"><span class="details-label">Pax Count:</span> {{ $booking->pax_count }} Pax</td>
                @endif
            </tr>
            @if($booking->pickup_location)
            <tr>
                <td colspan="3"><span class="details-label">Pickup Location:</span> {{ $booking->pickup_location }}</td>
            </tr>
            @endif
            @if($bus || $driver || count($seatMap) > 0)
            <tr>
                @if($bus)
                <td style="width: 33.3%;"><span class="details-label">Bus Plate #:</span> {{ $bus->plate_number }} ({{ $bus->model }})</td>
                @endif
                @if($driver)
                <td style="width: 33.3%;"><span class="details-label">Driver:</span> {{ $driver->first_name }} {{ $driver->last_name }}</td>
                @endif
                @if(count($seatMap) > 0)
                <td style="width: 33.3%;"><span class="details-label">Selected Seats:</span> {{ implode(', ', $seatMap) }}</td>
                @endif
            </tr>
            @endif
            @if($booking->arrival_datetime || $booking->departure_datetime)
            <tr>
                @if($booking->arrival_datetime)
                <td style="width: 33.3%;"><span class="details-label">Arrival:</span> {{ \Carbon\Carbon::parse($booking->arrival_datetime)->format('M d, Y h:i A') }}</td>
                @endif
                @if($booking->departure_datetime)
                <td style="width: 33.3%;"><span class="details-label">Departure:</span> {{ \Carbon\Carbon::parse($booking->departure_datetime)->format('M d, Y h:i A') }}</td>
                @endif
            </tr>
            @endif
        </table>
    </div>
    @endif

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 38%;">Service Description</th>
                <th style="width: 16%;">Date Processed</th>
                <th style="width: 12%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>
                    <div class="item-name">
                        @if($itineraries->count() > 0 && $item->service && in_array(strtolower($item->service->category ?? ''), ['tour package', 'educational tour', 'domestic tour', 'international tour', 'joiners']))
                            {{ $itineraries->first()->location ?? $item->service->name }}
                            @if($itineraries->count() > 1)
                                <span class="item-sub">({{ $itineraries->count() }}-Day Itinerary)</span>
                            @endif
                        @else
                            {{ $item->service ? $item->service->name : $item->custom_service_name }}
                        @endif
                    </div>
                    <div class="item-sub">{{ $item->service ? $item->service->category : 'Custom Services' }}</div>
                    @if($item->adults !== null || $item->children !== null)
                    <div class="pax-row">
                        @if($item->adults)
                        Adults: {{ $item->adults }} &times; &#8369;{{ number_format($item->service->adult_price ?? $item->unit_price, 2) }}
                        @endif
                        @if($item->adults && $item->children)
                         |
                        @endif
                        @if($item->children)
                        Children: {{ $item->children }} &times; &#8369;{{ number_format($item->service->child_price ?? $item->unit_price, 2) }}
                        @endif
                    </div>
                    @endif
                </td>
                <td>{{ $invoice->created_at->format('M d, Y') }}</td>
                <td class="center">{{ $item->quantity }}</td>
                <td class="right">&#8369;{{ number_format($item->unit_price, 2) }}</td>
                <td class="right" style="font-weight: 900; color: #0f172a;">
                    &#8369;{{ number_format($item->total_price, 2) }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Financial Summary -->
    <table class="summary-table">
        <tr>
            <td class="summary-col">
                <div class="summary-title">Balances Summary</div>
                <div class="summary-row">
                    <div class="summary-label">Grand Total:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->total_amount, 2) }}</div>
                </div>
                <div class="summary-row" style="color: #16a34a;">
                    <div class="summary-label">Amount Paid:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->amount_received, 2) }}</div>
                </div>
                @if($invoice->change > 0)
                <div class="summary-row" style="color: #16a34a;">
                    <div class="summary-label">Change Given:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->change, 2) }}</div>
                </div>
                @endif
                <div class="summary-row" style="border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-top: 3px;">
                    <div class="summary-label">Unpaid Balance:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->balance, 2) }}</div>
                </div>
            </td>

            <td class="summary-col">
                <div class="summary-title">Tax Breakdown</div>
                <div class="summary-row">
                    <div class="summary-label">VATable (12%):</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->subtotal, 2) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">VAT Amount:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->tax_amount, 2) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">VAT Exempt:</div>
                    <div class="summary-value">&#8369;0.00</div>
                </div>
            </td>

            <td class="summary-col">
                <div class="summary-title">Total Breakdown</div>
                <div class="summary-row">
                    <div class="summary-label">Subtotal:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->subtotal, 2) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">Adjustments:</div>
                    <div class="summary-value">&#8369;0.00</div>
                </div>
                <div class="summary-row" style="border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-top: 3px;">
                    <div class="summary-label">Amount Tendered:</div>
                    <div class="summary-value">&#8369;{{ number_format($invoice->amount_received, 2) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        <table class="footer-table">
            <tr>
                <td class="footer-left">
                    <strong>Payment Receipt Status:</strong><br>
                    This transaction has been settled in full.<br>
                    <strong>Payment Method:</strong> {{ strtoupper($invoice->payment_method) }}<br>
                    <strong>Receipt Generated:</strong> {{ now()->format('Y-m-d H:i:s') }}
                </td>
                <td class="footer-right">
                    <strong>Support &amp; Contacts:</strong><br>
                    Support Tel: 0976 471 1294<br>
                    Support Email: accounts@jvd-travel.com
                </td>
            </tr>
        </table>
    </div>

    <div class="thank-you">
        THANK YOU FOR CHOOSING JVD EVENT AND TRAVEL MANAGEMENT CO.
    </div>

</body>
</html>
