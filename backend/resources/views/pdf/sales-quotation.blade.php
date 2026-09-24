<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quotation {{ $quotation->quotation_number }}</title>
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

        /* Supplementary Details: Inclusions / Exclusions */
        .inclusions-box {
            margin: 8px 0 12px;
            padding: 8px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            font-size: 8px;
            line-height: 1.45;
        }
        .inclusions-title {
            font-weight: 900;
            color: #174a8b;
            text-transform: uppercase;
            margin-bottom: 3px;
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

    $preparerName = trim(($quotation->preparer?->first_name ?? '') . ' ' . ($quotation->preparer?->last_name ?? '')) ?: 'JVD Sales & Reservations Desk';
    $preparerEmail = $quotation->preparer?->email ?: ($company['email'] ?? 'accounts@jvd-travel.com');

    // Resolve package image if present
    $packageRawImage = null;
    if ($quotation->service && !empty($quotation->service->images) && is_array($quotation->service->images)) {
        $packageRawImage = $quotation->service->images[0] ?? null;
    }
    $packageBase64Image = \App\Services\DocumentPdfService::imageToBase64($packageRawImage);

    // Project description fallback
    $projectDescription = $quotation->description
        ?: ($quotation->service?->description
            ?: ($quotation->service_name
                ? "Official quotation for {$quotation->service_name}. JVD Event & Travel Management Co. provides end-to-end transport, logistical coordination, and personalized itinerary management."
                : 'Commercial event and travel management services as specified in the quotation line items.'));
@endphp

{{-- Subdued official brand watermark --}}
<div class="jvd-watermark">
    <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt="">
</div>

{{-- Official JVD brand footer with DOT Quality Seal --}}
@include('pdf.partials.brand-footer', [
    'footerNote' => 'Official Commercial Quotation. All transport units, accommodations, and itinerary inclusions remain subject to reconfirmation upon booking.',
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
            <div class="meta-row"><span class="meta-label">Quotation No:</span> <span class="meta-val">#{{ $quotation->quotation_number }}</span></div>
            <div class="meta-row"><span class="meta-label">Customer ID:</span> <span class="meta-val">{{ $quotation->customer_id ? '#'.str_pad($quotation->customer_id, 5, '0', STR_PAD_LEFT) : ($quotation->customer?->customer_code ?? 'WALK-IN') }}</span></div>
        </td>
        <td class="meta-right">
            <div class="meta-row"><span class="meta-label">Date:</span> <span class="meta-val">{{ $quotation->created_at ? $quotation->created_at->format('m/d/Y') : now()->format('m/d/Y') }}</span></div>
            <div class="meta-row"><span class="meta-label">Valid Until:</span> <span class="meta-val">{{ $quotation->valid_until ? $quotation->valid_until->format('m/d/Y') : ($quotation->created_at ? $quotation->created_at->addDays(15)->format('m/d/Y') : now()->addDays(15)->format('m/d/Y')) }}</span></div>
        </td>
    </tr>
</table>

{{-- Customer / Prepared For Section --}}
<div class="client-section">
    <div class="client-name">{{ $quotation->client_name }}</div>
    @if($quotation->client_company)<div class="client-company">{{ $quotation->client_company }}</div>@endif
    <div class="client-sub">
        @if($quotation->client_address){{ $quotation->client_address }}<br>@endif
        @if($quotation->client_contact){{ $quotation->client_contact }}@endif
        @if($quotation->client_contact && $quotation->client_email) &nbsp;·&nbsp; @endif
        @if($quotation->client_email){{ $quotation->client_email }}@endif
        @if($quotation->client_tin)<br>TIN: {{ $quotation->client_tin }}@endif
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

            @if($quotation->travel_date || $quotation->service_name)
            <div style="margin-top: 4px; font-weight: 700; color: #174a8b;">
                @if($quotation->service_name)Service: {{ $quotation->service_name }}@endif
                @if($quotation->service_name && $quotation->travel_date) &nbsp;|&nbsp; @endif
                @if($quotation->travel_date)Travel Date: {{ $quotation->travel_date->format('M d, Y') }}@endif
            </div>
            @endif

            {{-- Sporting the image of the package if available --}}
            @if($packageBase64Image)
            <div class="package-showcase">
                <table class="package-showcase-table">
                    <tr>
                        <td class="package-img-cell">
                            <img src="{{ $packageBase64Image }}" alt="Package Preview" class="package-img">
                        </td>
                        <td>
                            <div class="package-meta-title">{{ $quotation->service?->name ?? $quotation->service_name ?? 'Tour & Event Package' }}</div>
                            <div class="package-meta-detail">
                                @if($quotation->category || $quotation->service?->category)
                                    <strong>Category:</strong> {{ $quotation->category ?? $quotation->service?->category }}<br>
                                @endif
                                @if($quotation->travel_date)
                                    <strong>Scheduled:</strong> {{ $quotation->travel_date->format('M d, Y') }}<br>
                                @endif
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
        @foreach($quotation->line_items as $line)
        @php
            $qty = $line['quantity'] ?? 1;
            $unitPrice = $line['unit_price'] ?? 0;
            $lineAmount = $line['amount'] ?? ($qty * $unitPrice);
        @endphp
        <tr>
            <td>
                <div class="line-desc">{{ $line['description'] ?? 'Service line' }}</div>
            </td>
            <td class="center">{{ rtrim(rtrim(number_format($qty, 2), '0'), '.') }}</td>
            <td class="right">&#8369;{{ number_format($unitPrice, 2) }}</td>
            <td class="right"><strong>&#8369;{{ number_format($lineAmount, 2) }}</strong></td>
        </tr>
        @endforeach
    </tbody>
</table>

{{-- Supplementary Package Inclusions / Exclusions --}}
@if($quotation->inclusions || $quotation->exclusions || $quotation->notes)
<div class="inclusions-box">
    @if($quotation->inclusions)
        <div class="inclusions-title">Inclusions</div>
        <div style="margin-bottom: 5px;">{!! nl2br(e($quotation->inclusions)) !!}</div>
    @endif
    @if($quotation->exclusions)
        <div class="inclusions-title" style="color: #991b1b;">Exclusions</div>
        <div style="margin-bottom: 5px;">{!! nl2br(e($quotation->exclusions)) !!}</div>
    @endif
    @if($quotation->notes)
        <div class="inclusions-title" style="color: #475569;">Commercial Notes</div>
        <div>{!! nl2br(e($quotation->notes)) !!}</div>
    @endif
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
                    <td class="totals-value">&#8369;{{ number_format($quotation->subtotal, 2) }}</td>
                </tr>
                <tr>
                    <td class="totals-label">Value-Added Tax ({{ number_format($quotation->vat_rate, 2) }}%)</td>
                    <td class="totals-value">&#8369;{{ number_format($quotation->vat_amount, 2) }}</td>
                </tr>
                <tr>
                    <td class="totals-label">Others</td>
                    <td class="totals-value">&#8369;0.00</td>
                </tr>
                <tr class="total-highlight-row">
                    <td class="total-highlight-label">Total</td>
                    <td class="total-highlight-value">&#8369;{{ number_format($quotation->total, 2) }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{{-- Acceptance & Sign-off Section --}}
<table class="signoff-table">
    <tr>
        <td class="signoff-contact">
            If you have any questions concerning this quotation, please contact <strong>{{ $preparerName }}</strong> at <strong>{{ $preparerEmail }}</strong>.<br><br>
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
