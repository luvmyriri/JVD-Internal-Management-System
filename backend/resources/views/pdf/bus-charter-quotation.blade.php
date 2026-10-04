<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bus Charter Quotation {{ $quotation->quotation_number }}</title>
    <style>
        @include('pdf.partials.quotation-styles')

        .charter-subtitle {
            margin-top: 2px;
            color: #174a8b;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .route-point { font-weight: 700; color: #111827; }
        .route-label { color: #64748b; font-size: 7px; text-transform: uppercase; }
        .route-arrow { color: #174a8b; font-size: 7px; font-weight: 900; margin: 2px 0; text-transform: uppercase; }
        .date-detail { font-size: 7px; color: #64748b; margin-top: 2px; }
        .charter-note {
            margin: 0 0 14px;
            padding: 8px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            font-size: 8px;
            line-height: 1.5;
            color: #475569;
        }
        .charter-note strong { color: #111827; }
        .quote-table { table-layout: fixed; }
        .quote-table th, .quote-table td { overflow-wrap: break-word; }
        .quote-table tr { page-break-inside: avoid; }
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
    $preparerName = trim(($quotation->preparer?->first_name ?? '').' '.($quotation->preparer?->last_name ?? '')) ?: 'JVD Sales & Reservations Desk';
@endphp

<div class="jvd-watermark">
    <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt="">
</div>

@include('pdf.partials.brand-footer', [
    'footerNote' => 'Bus Charter Quotation. Route, schedule, vehicle availability, and final service details are subject to booking confirmation.',
])

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
            <div class="charter-subtitle">Bus charter service</div>
        </td>
    </tr>
</table>

<table class="meta-table">
    <tr>
        <td class="meta-left">
            <div class="meta-row"><span class="meta-label">Quotation No:</span> <span class="meta-val">#{{ $quotation->quotation_number }}</span></div>
            <div class="meta-row"><span class="meta-label">Customer ID:</span> <span class="meta-val">{{ $quotation->customer_id ? '#'.str_pad($quotation->customer_id, 5, '0', STR_PAD_LEFT) : 'WALK-IN' }}</span></div>
        </td>
        <td class="meta-right">
            <div class="meta-row"><span class="meta-label">Date:</span> <span class="meta-val">{{ $quotation->created_at?->format('m/d/Y') ?? now()->format('m/d/Y') }}</span></div>
            <div class="meta-row"><span class="meta-label">Valid Until:</span> <span class="meta-val">{{ $quotation->valid_until?->format('m/d/Y') }}</span></div>
        </td>
    </tr>
</table>

<div class="client-section">
    <div class="client-name">{{ $quotation->client_name }}</div>
    @if($quotation->client_company && $quotation->client_company !== $quotation->client_name)
        <div class="client-company">{{ $quotation->client_company }}</div>
    @endif
    <div class="client-sub">
        @if($quotation->client_contact){{ $quotation->client_contact }}@endif
        @if($quotation->client_contact && $quotation->client_email) &nbsp;·&nbsp; @endif
        @if($quotation->client_email){{ $quotation->client_email }}@endif
    </div>
</div>

<div class="solid-accent-bar"></div>

<table class="project-section-table">
    <tr>
        <td class="project-label-cell">Travel arrangement</td>
        <td class="project-body-cell">
            <div>{{ $quotation->description ?: 'Charter transport as itemized below.' }}</div>
            <div style="margin-top: 3px;">Each line records the travel date, route, duration, number of units, and rate per unit.</div>
            @if($quotation->travel_date)
                <div style="margin-top: 4px; font-weight: 700; color: #174a8b;">First travel date: {{ $quotation->travel_date->format('M d, Y') }}</div>
            @endif
        </td>
    </tr>
</table>

<table class="quote-table">
    <thead>
        <tr>
            <th style="width: 16%;">Travel dates</th>
            <th style="width: 30%;">Route / particulars</th>
            <th style="width: 13%;">Duration</th>
            <th class="center" style="width: 9%;">Units</th>
            <th class="right" style="width: 16%;">Rate / unit</th>
            <th class="right" style="width: 16%;">Amount</th>
        </tr>
    </thead>
    <tbody>
        @foreach($quotation->line_items as $line)
            @php
                $quantity = (float) ($line['quantity'] ?? 1);
                $unitPrice = (float) ($line['unit_price'] ?? 0);
                $amount = (float) ($line['amount'] ?? $quantity * $unitPrice);
                $startDate = $line['travel_start_date'] ?? null;
                $endDate = $line['travel_end_date'] ?? null;
            @endphp
            <tr>
                <td>
                    <div class="line-desc">{{ $startDate ? date('M j, Y', strtotime($startDate)) : ($quotation->travel_date?->format('M j, Y') ?? 'To be confirmed') }}</div>
                    @if($endDate)<div class="date-detail">to {{ date('M j, Y', strtotime($endDate)) }}</div>@endif
                </td>
                <td>
                    @if(!empty($line['pickup_location']) || !empty($line['destination']))
                        <div class="route-label">Pickup</div>
                        <div class="route-point">{{ $line['pickup_location'] ?? 'To be confirmed' }}</div>
                        <div class="route-arrow">to</div>
                        <div class="route-label">Destination</div>
                        <div class="route-point">{{ $line['destination'] ?? 'To be confirmed' }}</div>
                    @else
                        <div class="line-desc">{{ $line['description'] ?? 'Bus charter service' }}</div>
                    @endif
                </td>
                <td>{{ $line['duration'] ?? 'As arranged' }}</td>
                <td class="center">{{ rtrim(rtrim(number_format($quantity, 2), '0'), '.') }}</td>
                <td class="right">PHP {{ number_format($unitPrice, 2) }}</td>
                <td class="right"><strong>PHP {{ number_format($amount, 2) }}</strong></td>
            </tr>
        @endforeach
    </tbody>
</table>

@if($quotation->inclusions || $quotation->exclusions)
    <div class="charter-note">
        @if($quotation->inclusions)<strong>Inclusions:</strong> {!! nl2br(e($quotation->inclusions)) !!}<br>@endif
        @if($quotation->exclusions)<strong>Exclusions:</strong> {!! nl2br(e($quotation->exclusions)) !!}@endif
    </div>
@endif

<table class="totals-wrapper-table">
    <tr>
        <td class="totals-spacer"></td>
        <td class="totals-col">
            <table class="totals-table">
                <tr><td class="totals-label">Quoted price</td><td class="totals-value">PHP {{ number_format($quotation->subtotal, 2) }}</td></tr>
                @if((float) $quotation->vat_amount > 0)
                <tr><td class="totals-label">VAT on previously issued quotation</td><td class="totals-value">PHP {{ number_format($quotation->vat_amount, 2) }}</td></tr>
                @endif
                <tr class="total-highlight-row"><td class="total-highlight-label">Total</td><td class="total-highlight-value">PHP {{ number_format($quotation->total, 2) }}</td></tr>
            </table>
        </td>
    </tr>
</table>

<table class="signoff-table">
    <tr>
        <td class="signoff-contact">
            Questions about this charter? Contact the <strong>Sales &amp; Reservations Desk</strong> at <strong>{{ $company['email'] }}</strong> or <strong>{{ $company['phone'] }}</strong>.<br><br>
            <em>This quotation is an estimate. The schedule and vehicle allocation are confirmed only after the booking is accepted.</em>
            <div class="signoff-thanks">Thank you for your business!</div>
        </td>
        <td class="signoff-acceptance">
            <div class="signoff-prompt">Prepared by: {{ $preparerName }}<br><br>Please confirm your acceptance of this quote:</div>
            <div class="signoff-line">Signature over printed name and date</div>
        </td>
    </tr>
</table>
</body>
</html>
