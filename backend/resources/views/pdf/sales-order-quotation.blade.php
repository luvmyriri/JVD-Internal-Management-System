<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sales Quotation {{ $order->order_number }}</title>
    <style>
        @page {
            size: A4;
            margin: 12mm 15mm 22mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #111827;
            margin: 0;
            padding: 0;
            font-size: 9px;
            line-height: 1.45;
        }

        /* Watermark & Brand Footer Integration */
        @include('pdf.partials.brand-styles')

        /* Top Header Grid */
        .quote-header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }
        .quote-header-table td {
            vertical-align: top;
        }
        .brand-col {
            width: 58%;
        }
        .brand-logo {
            height: 46px;
            width: auto;
            margin-bottom: 3px;
        }
        .brand-name {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #111827;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.1;
        }
        .brand-tagline {
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: 1.2px;
            color: #64748b;
            text-transform: uppercase;
            margin: 2px 0 6px;
        }
        .brand-details {
            font-size: 7.5px;
            color: #475569;
            line-height: 1.35;
        }

        .title-col {
            width: 42%;
            text-align: right;
        }
        .quote-title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #111827;
            margin: 0 0 10px;
            line-height: 1;
        }

        /* Metadata Grid */
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
        }
        .meta-table td {
            vertical-align: top;
            font-size: 8.5px;
            line-height: 1.5;
        }
        .meta-left {
            width: 55%;
            text-align: left;
        }
        .meta-right {
            width: 45%;
            text-align: right;
        }
        .meta-label {
            font-weight: 700;
            color: #475569;
        }
        .meta-val {
            font-weight: 900;
            color: #111827;
        }

        /* Client Section */
        .client-section {
            margin-bottom: 12px;
            font-size: 8.5px;
            line-height: 1.45;
        }
        .client-name {
            font-size: 11px;
            font-weight: 900;
            color: #111827;
            margin-bottom: 1px;
        }
        .client-company {
            font-weight: 700;
            color: #1f2937;
        }
        .client-sub {
            color: #4b5563;
        }

        /* Solid Accent Divider */
        .solid-accent-bar {
            height: 7px;
            background: #111827;
            width: 100%;
            margin: 0 0 12px;
        }

        /* Project / Package Description */
        .project-section-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .project-section-table td {
            vertical-align: top;
        }
        .project-label-cell {
            width: 24%;
            font-size: 9.5px;
            font-weight: 900;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .project-body-cell {
            width: 76%;
            font-size: 8.5px;
            color: #374151;
            line-height: 1.5;
        }

        /* Package Image Showcase */
        .package-showcase {
            margin-top: 8px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 4px;
            padding: 8px;
        }
        .package-showcase-table {
            width: 100%;
            border-collapse: collapse;
        }
        .package-showcase-table td {
            vertical-align: middle;
        }
        .package-img-cell {
            width: 130px;
            padding-right: 12px;
            text-align: center;
        }
        .package-img {
            max-width: 125px;
            max-height: 80px;
            border-radius: 3px;
            border: 1px solid #cbd5e1;
        }
        .package-meta-title {
            font-size: 10px;
            font-weight: 900;
            color: #174a8b;
            margin-bottom: 3px;
        }
        .package-meta-detail {
            font-size: 8px;
            color: #475569;
            line-height: 1.45;
        }

        /* Table of Line Items */
        .quote-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 12px;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
        }
        .quote-table th {
            padding: 8px 6px;
            font-size: 8.5px;
            font-weight: 900;
            color: #111827;
            border-bottom: 1.5px solid #111827;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .quote-table th.right, .quote-table td.right {
            text-align: right;
        }
        .quote-table th.center, .quote-table td.center {
            text-align: center;
        }
        .quote-table td {
            padding: 8px 6px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 8.5px;
        }
        .quote-table tr:last-child td {
            border-bottom: none;
        }
        .line-desc {
            font-weight: 700;
            color: #111827;
        }

        /* Fleet Assignment Box */
        .fleet-section {
            margin: 10px 0 14px;
        }
        .fleet-heading {
            font-size: 9px;
            font-weight: 900;
            color: #174a8b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        /* Commercial Notes */
        .terms-box {
            margin: 10px 0;
            padding: 8px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            color: #4b5e73;
            font-size: 8px;
            line-height: 1.5;
        }

        /* Totals Block */
        .totals-wrapper-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            margin-bottom: 16px;
        }
        .totals-spacer {
            width: 52%;
        }
        .totals-col {
            width: 48%;
            vertical-align: top;
        }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 4px 6px;
            font-size: 8.5px;
            vertical-align: middle;
        }
        .totals-label {
            font-weight: 700;
            color: #4b5563;
            text-align: left;
        }
        .totals-value {
            font-weight: 700;
            color: #111827;
            text-align: right;
            white-space: nowrap;
        }
        .total-highlight-row {
            background: #111827;
            color: #ffffff;
        }
        .total-highlight-label {
            padding: 6px 10px !important;
            font-size: 10.5px !important;
            font-weight: 900 !important;
            color: #ffffff !important;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .total-highlight-value {
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            font-weight: 900 !important;
            color: #ffffff !important;
            text-align: right;
            white-space: nowrap;
        }

        /* Sign-off & Acceptance Section */
        .signoff-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
        }
        .signoff-table td {
            vertical-align: top;
        }
        .signoff-contact {
            width: 52%;
            padding-right: 15px;
            font-size: 8px;
            color: #4b5563;
            line-height: 1.5;
        }
        .signoff-thanks {
            margin-top: 8px;
            font-size: 9.5px;
            font-weight: 900;
            color: #111827;
        }
        .signoff-acceptance {
            width: 48%;
            font-size: 8px;
            color: #111827;
        }
        .signoff-prompt {
            font-weight: 700;
            margin-bottom: 26px;
        }
        .signoff-line {
            border-top: 1px solid #111827;
            padding-top: 4px;
            text-align: center;
            font-size: 7.5px;
            font-style: italic;
            color: #4b5563;
        }
    </style>
</head>
<body>

@php
    $company = $company ?? [
        'name' => 'JVD Event & Travel Management Company',
        'address' => 'UNIT 6 - Aryanna Village Center, Brgy 175 Susano Road, Camarin, Caloocan City',
        'phone' => '0976 471 1294',
        'email' => 'accounts@jvd-travel.com',
        'registration' => '912-883-911-000',
    ];

    $customerName = $order->invoice?->customer_name ?? $order->customer?->full_name ?? 'Valued Client';
    $customerEmail = $order->invoice?->customer_email ?? $order->customer?->email;
    $customerContact = $order->invoice?->customer_contact ?? $order->customer?->phone;
    $customerAddress = $order->invoice?->customer_address ?? $order->customer?->address;
    $customerId = $order->customer_id ? '#'.str_pad($order->customer_id, 5, '0', STR_PAD_LEFT) : ($order->customer?->id ? '#'.str_pad($order->customer->id, 5, '0', STR_PAD_LEFT) : 'JVD-CUST');

    $agentName = trim(($order->agent?->first_name ?? '') . ' ' . ($order->agent?->last_name ?? '')) ?: 'JVD Sales & Reservations Desk';
    $agentEmail = $order->agent?->email ?: ($company['email'] ?? 'accounts@jvd-travel.com');

    // Find package image candidate from items / services
    $packageRawImage = null;
    $packageTitle = null;
    foreach ($order->items as $item) {
        if (!empty($item->service?->images) && is_array($item->service->images)) {
            $packageRawImage = $item->service->images[0] ?? null;
            $packageTitle = $item->service->name;
            break;
        }
        $meta = $item->details_snapshot ?? [];
        if (!empty($meta['images']) && is_array($meta['images'])) {
            $packageRawImage = $meta['images'][0] ?? null;
            $packageTitle = $item->title;
            break;
        }
        if (!empty($item->fulfillment?->package?->images) && is_array($item->fulfillment->package->images)) {
            $packageRawImage = $item->fulfillment->package->images[0] ?? null;
            $packageTitle = $item->fulfillment->package->name ?? $item->title;
            break;
        }
    }
    $packageBase64Image = \App\Services\DocumentPdfService::imageToBase64($packageRawImage);

    // Fleet assignment extraction (multi-bus / multi-driver support)
    $allFleet = [];
    if (!empty($order->invoice?->charterBooking?->fleet_assignments)) {
        $allFleet = $order->invoice->charterBooking->fleet_assignments;
    }
    if (empty($allFleet) && !empty($order->items)) {
        foreach ($order->items as $oItem) {
            if (!empty($oItem->fulfillment?->fleet_assignments)) {
                $allFleet = $oItem->fulfillment->fleet_assignments;
                break;
            }
            $meta = $oItem->details_snapshot ?? [];
            if (!empty($meta['fleet_assignments'])) {
                $allFleet = $meta['fleet_assignments'];
                break;
            }
            if (!empty($meta['bus_assignments'])) {
                $allFleet = $meta['bus_assignments'];
                break;
            }
        }
    }
    if (empty($allFleet) && !empty($order->invoice?->items)) {
        foreach ($order->invoice->items as $invItem) {
            $meta = is_array($invItem->item_metadata) ? $invItem->item_metadata : json_decode($invItem->item_metadata ?? '[]', true);
            if (!empty($meta['fleet_assignments'])) {
                $allFleet = $meta['fleet_assignments'];
                break;
            }
            if (!empty($meta['bus_assignments'])) {
                $allFleet = $meta['bus_assignments'];
                break;
            }
        }
    }

    $validUntilDate = $order->travel_starts_at
        ?: ($order->created_at ? $order->created_at->addDays(15) : now()->addDays(15));

    $projectDescription = $order->items->first()?->service?->description
        ?: ($order->metadata['description'] ?? ($order->items->first()?->description ?: 'Comprehensive travel package, logistical transport coordination, and operations management.'));
@endphp

{{-- Subdued official brand watermark --}}
<div class="jvd-watermark">
    <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt="">
</div>

{{-- Official JVD brand footer with DOT Quality Seal --}}
@include('pdf.partials.brand-footer', [
    'footerNote' => 'Quotation generated from recorded Sales transaction. Vehicle availability and schedule remain subject to final reconfirmation.',
])

{{-- Top Header Section --}}
<table class="quote-header-table">
    <tr>
        <td class="brand-col">
            <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt="JVD Logo" class="brand-logo"><br>
            <h2 class="brand-name">{{ $company['name'] }}</h2>
            <div class="brand-tagline">Driven by Trust · Travel &amp; Events Management</div>
            <div class="brand-details">
                {{ $company['address'] }}<br>
                Phone: {{ $company['phone'] }} &nbsp;|&nbsp; Tel: (02) 8293 8068<br>
                Email: {{ $company['email'] }} &nbsp;|&nbsp; TIN: {{ $company['registration'] ?? '912-883-911-000' }}
            </div>
        </td>
        <td class="title-col">
            <h1 class="quote-title">QUOTATION</h1>
        </td>
    </tr>
</table>

{{-- Metadata Grid --}}
<table class="meta-table">
    <tr>
        <td class="meta-left">
            <div class="meta-row"><span class="meta-label">Quotation No:</span> <span class="meta-val">#{{ $order->order_number }}</span></div>
            <div class="meta-row"><span class="meta-label">Customer ID:</span> <span class="meta-val">{{ $customerId }}</span></div>
        </td>
        <td class="meta-right">
            <div class="meta-row"><span class="meta-label">Date:</span> <span class="meta-val">{{ $order->created_at ? $order->created_at->format('m/d/Y') : now()->format('m/d/Y') }}</span></div>
            <div class="meta-row"><span class="meta-label">Valid Until:</span> <span class="meta-val">{{ $validUntilDate ? $validUntilDate->format('m/d/Y') : now()->addDays(15)->format('m/d/Y') }}</span></div>
        </td>
    </tr>
</table>

{{-- Customer / Prepared For Section --}}
<div class="client-section">
    <div class="client-name">{{ $customerName }}</div>
    @if(!empty($order->customer?->company_name))
        <div class="client-company">{{ $order->customer->company_name }}</div>
    @endif
    <div class="client-sub">
        @if($customerAddress){{ $customerAddress }}<br>@endif
        @if($customerContact){{ $customerContact }}@endif
        @if($customerContact && $customerEmail) &nbsp;·&nbsp; @endif
        @if($customerEmail){{ $customerEmail }}@endif
    </div>
</div>

{{-- Solid Accent Divider Bar --}}
<div class="solid-accent-bar"></div>

{{-- Project Description & Package Showcase --}}
<table class="project-section-table">
    <tr>
        <td class="project-label-cell">
            Project Description
        </td>
        <td class="project-body-cell">
            <div>{{ $projectDescription }}</div>

            @if($order->travel_starts_at || $order->travel_ends_at)
            <div style="margin-top: 4px; font-weight: 700; color: #174a8b;">
                Travel Period: {{ $order->travel_starts_at?->format('M d, Y') ?: 'As agreed' }}
                @if($order->travel_ends_at) to {{ $order->travel_ends_at->format('M d, Y') }} @endif
            </div>
            @endif

            {{-- Sporting package image if available --}}
            @if($packageBase64Image)
            <div class="package-showcase">
                <table class="package-showcase-table">
                    <tr>
                        <td class="package-img-cell">
                            <img src="{{ $packageBase64Image }}" alt="Package Preview" class="package-img">
                        </td>
                        <td>
                            <div class="package-meta-title">{{ $packageTitle ?? 'Featured Event & Tour Package' }}</div>
                            <div class="package-meta-detail">
                                @if($order->travel_starts_at)
                                    <strong>Schedule:</strong> {{ $order->travel_starts_at->format('M d, Y') }}<br>
                                @endif
                                <strong>Reference Order:</strong> {{ $order->order_number }}<br>
                                <em>Official service visual preview from catalog</em>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
            @endif
        </td>
    </tr>
</table>

{{-- Itemized Table --}}
<table class="quote-table">
    <thead>
        <tr>
            <th style="width: 48%;">Description</th>
            <th class="center" style="width: 12%;">Qty</th>
            <th class="right" style="width: 20%;">Price</th>
            <th class="right" style="width: 20%;">Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($order->items as $item)
        <tr>
            <td>
                <div class="line-desc">{{ $item->title }}</div>
                @if($item->description)<div style="font-size: 8px; color: #64748b; margin-top: 1px;">{{ $item->description }}</div>@endif
                @if($item->scheduled_start || $item->traveler_count)
                    <div style="font-size: 7.5px; color: #174a8b; margin-top: 2px;">
                        @if($item->scheduled_start){{ $item->scheduled_start->format('M d, Y h:i A') }}@endif
                        @if($item->scheduled_start && $item->traveler_count) &nbsp;·&nbsp; @endif
                        @if($item->traveler_count){{ $item->traveler_count }} traveler(s)@endif
                    </div>
                @endif
            </td>
            <td class="center">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td>
            <td class="right">&#8369;{{ number_format($item->unit_price, 2) }}</td>
            <td class="right"><strong>&#8369;{{ number_format($item->subtotal, 2) }}</strong></td>
        </tr>
        @endforeach
    </tbody>
</table>

{{-- Assigned Fleet & Drivers (if applicable, e.g. multi-bus charter) --}}
@if(!empty($allFleet) && count($allFleet) > 0)
<div class="fleet-section">
    <div class="fleet-heading">Assigned Fleet &amp; Drivers ({{ count($allFleet) }} {{ count($allFleet) === 1 ? 'Unit' : 'Units' }})</div>
    <table class="quote-table" style="margin-top: 4px; margin-bottom: 8px;">
        <thead>
            <tr>
                <th style="width: 8%;">Unit</th>
                <th style="width: 37%;">Vehicle / Plate</th>
                <th style="width: 18%;">Capacity</th>
                <th style="width: 37%;">Assigned Driver</th>
            </tr>
        </thead>
        <tbody>
            @foreach($allFleet as $fIdx => $fleetUnit)
            <tr>
                <td>{{ $fIdx + 1 }}</td>
                <td>
                    <strong>{{ $fleetUnit['plate_number'] ?? (!empty($fleetUnit['bus_id']) ? 'Vehicle #'.$fleetUnit['bus_id'] : 'Vehicle TBA') }}</strong>
                    @if(!empty($fleetUnit['model']))<br><span style="color:#607087">{{ $fleetUnit['model'] }}</span>@endif
                </td>
                <td>{{ !empty($fleetUnit['seating_capacity']) ? $fleetUnit['seating_capacity'].' seats' : '—' }}</td>
                <td>
                    <strong>{{ $fleetUnit['driver_name'] ?? (!empty($fleetUnit['driver_id']) ? 'Driver #'.$fleetUnit['driver_id'] : 'Driver TBA') }}</strong>
                    @if(!empty($fleetUnit['driver_phone']))<br><span style="color:#607087">{{ $fleetUnit['driver_phone'] }}</span>@endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- Summary / Totals Block --}}
<table class="totals-wrapper-table">
    <tr>
        <td class="totals-spacer"></td>
        <td class="totals-col">
            <table class="totals-table">
                <tr>
                    <td class="totals-label">Subtotal</td>
                    <td class="totals-value">&#8369;{{ number_format($order->subtotal, 2) }}</td>
                </tr>
                <tr>
                    <td class="totals-label">Value-Added Tax</td>
                    <td class="totals-value">&#8369;{{ number_format($order->tax_amount, 2) }}</td>
                </tr>
                <tr>
                    <td class="totals-label">Others</td>
                    <td class="totals-value">&#8369;0.00</td>
                </tr>
                <tr class="total-highlight-row">
                    <td class="total-highlight-label">Total</td>
                    <td class="total-highlight-value">&#8369;{{ number_format($order->total_amount, 2) }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{{-- Commercial Notes --}}
<div class="terms-box">
    <strong>Commercial Notes:</strong> This quotation reflects the service configuration, schedule, passenger count, and rates recorded in Sales. Vehicle, driver, seat, supplier, and venue availability must be reconfirmed before travel. Any approved changes must be recorded through the transaction lifecycle.
</div>

{{-- Acceptance & Sign-off Section --}}
<table class="signoff-table">
    <tr>
        <td class="signoff-contact">
            If you have any questions concerning this quotation, please contact <strong>{{ $agentName }}</strong> at <strong>{{ $agentEmail }}</strong>.<br><br>
            <em>This quotation remains an estimate and does not constitute a guaranteed reservation until accepted and confirmed with an initial deposit.</em>
            <div class="signoff-thanks">Thank you for your business!</div>
        </td>
        <td class="signoff-acceptance">
            <div class="signoff-prompt">Please confirm your acceptance of this quote:</div>
            <div class="signoff-line">Signature over printed name and date</div>
        </td>
    </tr>
</table>

</body>
</html>
