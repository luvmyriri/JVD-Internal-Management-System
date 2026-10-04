<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quotation - {{ $package->name }}</title>
    <style>
        @include('pdf.partials.quotation-styles')
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

    $schoolCustomer = $package->schoolCustomer;
    $clientName = $package->school_name ?: trim(($schoolCustomer?->first_name ?? '').' '.($schoolCustomer?->last_name ?? '')) ?: 'Valued Educational Partner';
    $clientEmail = $schoolCustomer?->email;
    $clientPhone = $schoolCustomer?->phone;
    $customerId = $schoolCustomer?->id ? '#'.str_pad($schoolCustomer->id, 5, '0', STR_PAD_LEFT) : ('PKG-'.str_pad($package->id, 4, '0', STR_PAD_LEFT));

    $quotationNo = $package->tour_code ?: ('JVD-ED-'.str_pad($package->id, 5, '0', STR_PAD_LEFT));
    $dateCreated = $package->created_at ? $package->created_at->format('m/d/Y') : ($generatedAt ?? now())->format('m/d/Y');
    $validUntil = $package->starts_at ? $package->starts_at->format('m/d/Y') : ($package->created_at ? $package->created_at->addDays(30)->format('m/d/Y') : now()->addDays(30)->format('m/d/Y'));

    // Resolve package image
    $rawImage = null;
    if (!empty($package->images) && is_array($package->images)) {
        $rawImage = $package->images[0] ?? null;
    } elseif (!empty($package->program?->images) && is_array($package->program->images)) {
        $rawImage = $package->program->images[0] ?? null;
    } elseif (!empty($package->program?->service?->images) && is_array($package->program->service->images)) {
        $rawImage = $package->program->service->images[0] ?? null;
    }
    $packageBase64Image = \App\Services\DocumentPdfService::imageToBase64($rawImage);

    $paxCapacity = $package->maximum_capacity ?: 1;
    $ratePerHead = (float)($package->rate_per_head ?? 0);
    $packageSubtotal = $ratePerHead * $paxCapacity;

    $projectDescription = $package->description
        ?: ($package->program?->learning_objectives
            ?: "Educational field tour and experiential learning package for {$package->name} ({$package->tour_code}). Specially crafted for student enrichment, safety compliance, and immersive group education.");
@endphp

{{-- Subdued official brand watermark --}}
<div class="jvd-watermark">
    <img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt="">
</div>

{{-- Official JVD brand footer with DOT Quality Seal --}}
@include('pdf.partials.brand-footer', [
    'footerNote' => 'Educational Tour Quotation. Rate per student covers specified itinerary, safety coordinators, and chartered transport. Subject to confirmation.',
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
            <div class="meta-row"><span class="meta-label">Quotation No:</span> <span class="meta-val">#{{ $quotationNo }}</span></div>
            <div class="meta-row"><span class="meta-label">Customer ID:</span> <span class="meta-val">{{ $customerId }}</span></div>
        </td>
        <td class="meta-right">
            <div class="meta-row"><span class="meta-label">Date:</span> <span class="meta-val">{{ $dateCreated }}</span></div>
            <div class="meta-row"><span class="meta-label">Valid Until:</span> <span class="meta-val">{{ $validUntil }}</span></div>
        </td>
    </tr>
</table>

{{-- Customer / Prepared For Section --}}
<div class="client-section">
    <div class="client-name">{{ $clientName }}</div>
    @if($package->program?->name)
        <div class="client-company">{{ $package->program->name }}</div>
    @endif
    <div class="client-sub">
        @if($package->pickup_location)Pickup: {{ $package->pickup_location }}<br>@endif
        @if($clientPhone){{ $clientPhone }}@endif
        @if($clientPhone && $clientEmail) &nbsp;·&nbsp; @endif
        @if($clientEmail){{ $clientEmail }}@endif
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

            <div style="margin-top: 4px; font-weight: 700; color: #174a8b;">
                Package: {{ $package->name }} ({{ $package->tour_code }})
                @if($package->starts_at)
                    &nbsp;|&nbsp; Dates: {{ $package->starts_at->format('M d, Y') }} to {{ $package->ends_at->format('M d, Y') }}
                @endif
                @if($package->maximum_capacity)
                    &nbsp;|&nbsp; Target Capacity: {{ $package->maximum_capacity }} students
                @endif
            </div>

            {{-- Sporting package image if available --}}
            @if($packageBase64Image)
            <div class="package-showcase">
                <table class="package-showcase-table">
                    <tr>
                        <td class="package-img-cell">
                            <img src="{{ $packageBase64Image }}" alt="Tour Package Photo" class="package-img">
                        </td>
                        <td>
                            <div class="package-meta-title">{{ $package->name }}</div>
                            <div class="package-meta-detail">
                                <strong>Tour Code:</strong> {{ $package->tour_code }}<br>
                                @if($package->program?->name)
                                    <strong>Curriculum Program:</strong> {{ $package->program->name }}<br>
                                @endif
                                <em>Official experiential tour visual preview</em>
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
        <tr>
            <td>
                <div class="line-desc">Student package rate per participant</div>
                <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
                    {{ $package->name }} · {{ optional($package->program)->name ?? 'Educational Program' }}
                </div>
                <div style="font-size: 7.5px; color: #174a8b; margin-top: 2px;">
                    Scheduled: {{ $package->starts_at->format('M d, Y') }} to {{ $package->ends_at->format('M d, Y') }} · Maximum Capacity: {{ $package->maximum_capacity }}
                </div>
            </td>
            <td class="center">{{ $paxCapacity }}</td>
            <td class="right">&#8369;{{ number_format($ratePerHead, 2) }}</td>
            <td class="right"><strong>&#8369;{{ number_format($packageSubtotal, 2) }}</strong></td>
        </tr>
    </tbody>
</table>

{{-- Summary / Totals Block --}}
<table class="totals-wrapper-table">
    <tr>
        <td class="totals-spacer"></td>
        <td class="totals-col">
            <table class="totals-table">
                <tr>
                    <td class="totals-label">Rate per student</td>
                    <td class="totals-value">&#8369;{{ number_format($ratePerHead, 2) }}</td>
                </tr>
                <tr>
                    <td class="totals-label">Est. Participants</td>
                    <td class="totals-value">{{ $paxCapacity }} students</td>
                </tr>
                <tr>
                    <td class="totals-label">Others</td>
                    <td class="totals-value">&#8369;0.00</td>
                </tr>
                <tr class="total-highlight-row">
                    <td class="total-highlight-label">Total</td>
                    <td class="total-highlight-value">&#8369;{{ number_format($packageSubtotal, 2) }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{{-- Acceptance & Sign-off Section --}}
<table class="signoff-table">
    <tr>
        <td class="signoff-contact">
            If you have any questions concerning this quotation, please contact the <strong>Educational Tours Desk</strong> at <strong>{{ $company['email'] }}</strong> or <strong>{{ $company['phone'] }}</strong>.<br><br>
            <em>This quotation remains an estimate and does not constitute a guaranteed reservation until accepted and confirmed with a signed agreement.</em>
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
