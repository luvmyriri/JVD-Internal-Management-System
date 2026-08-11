<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Service Contract {{ $contract->contract_number }}</title>
    <style>
        @page { size: A4; margin: 14mm 14mm 22mm; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #243247; margin: 0; font-size: 10px; line-height: 1.45; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .header-left { width: 60%; vertical-align: top; }
        .header-right { width: 40%; text-align: right; vertical-align: top; }
        .company-logo { font-size: 16px; font-weight: 950; color: #1e3a8a; }
        .document-title { text-align: center; font-size: 16px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #1e293b; margin: 20px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.5px; margin: 18px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .terms-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 10px; white-space: pre-wrap; }
        table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.data-table th { background-color: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 8px; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
        table.data-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .signature-block { margin-top: 30px; width: 100%; border-collapse: collapse; }
        .signature-img { height: 60px; border-bottom: 1px solid #94a3b8; }
        .meta-label { font-weight: bold; color: #475569; }
        .amount { text-align: right !important; white-space: nowrap; }
        .totals { width: 42%; margin-left: 58%; border-collapse: collapse; margin-top: 8px; }
        .totals td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; }
        .totals .grand td { border-top: 2px solid #1e3a8a; border-bottom: 0; font-size: 12px; font-weight: bold; color: #1e3a8a; }
        .footer { position: fixed; bottom: -11mm; left: 0; right: 0; border-top: 1px solid #d9e2ec; padding-top: 5px; color: #64748b; font-size: 7px; }
        .page-number:after { content: counter(page); }
        body > .header-table, body > .document-title, body > .footer { display: none; }
        @include('pdf.partials.brand-styles')
    </style>
</head>
<body>
    @include('pdf.partials.brand-header', ['documentTitle' => 'Contract Service Agreement', 'documentReference' => $contract->contract_number, 'documentDate' => $contract->created_at])
    @include('pdf.partials.brand-footer', ['footerNote' => 'Contract service agreement. Changes are valid only when documented and approved by both parties.'])
    <table class="header-table">
        <tr>
            <td class="header-left">
                <div class="company-logo">{{ $company['name'] }}</div>
                <div style="margin-top: 6px; font-size: 9px; color: #475569;">
                    {{ $company['address'] }}<br>
                    {{ $company['phone'] }} &middot; {{ $company['email'] }}<br>
                    Registration: {{ $company['registration'] }}
                </div>
            </td>
            <td class="header-right">
                <div><span class="meta-label">Contract No:</span> {{ $contract->contract_number }}</div>
                <div><span class="meta-label">Invoice No:</span> {{ $invoice->invoice_number }}</div>
                <div><span class="meta-label">Status:</span> {{ ucfirst(str_replace('_', ' ', $contract->status)) }}</div>
            </td>
        </tr>
    </table>

    <div class="document-title">Service Contract</div>

    <div class="section-title">Customer</div>
    <div>{{ $invoice->customer_name }}</div>
    <div style="font-size: 9px; color: #475569;">{{ $invoice->customer_address ?: 'Address not provided' }}</div>
    <div style="font-size: 9px; color: #475569;">{{ $invoice->customer_email ?: 'No email provided' }} &middot; {{ $invoice->customer_contact ?: 'No phone provided' }}</div>

    <div class="section-title">Services &amp; Pricing</div>
    <table class="data-table">
        <thead>
            <tr><th style="width: 38%">Service</th><th style="width: 25%">Scope</th><th class="amount">Qty</th><th class="amount">Unit Price</th><th class="amount">Amount</th></tr>
        </thead>
        <tbody>
        @foreach($invoice->items as $item)
            <tr>
                <td>
                    <strong>{{ $item->item_name ?? $item->service?->name ?? 'Travel service' }}</strong><br>
                    <span style="font-size: 8px; color: #64748b;">{{ strtoupper(str_replace('_', ' ', $item->service_type ?? $item->service?->service_type ?? 'service')) }}</span>
                </td>
                <td>{{ $item->item_description ?? $item->service?->description ?? '-' }}</td>
                <td class="amount">{{ number_format($item->quantity, 0) }}</td>
                <td class="amount">PHP {{ number_format($item->unit_price, 2) }}</td>
                <td class="amount">PHP {{ number_format($item->total_price, 2) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    <table class="totals">
        <tr><td>Subtotal</td><td class="amount">PHP {{ number_format($invoice->subtotal, 2) }}</td></tr>
        <tr><td>VAT / Tax</td><td class="amount">PHP {{ number_format($invoice->tax_amount, 2) }}</td></tr>
        <tr class="grand"><td>Contract Total</td><td class="amount">PHP {{ number_format($invoice->total_amount, 2) }}</td></tr>
    </table>

    @if($contract->deposit_required_amount || $contract->deposit_required_percent)
    <div class="section-title">Deposit</div>
    <div>
        @if($contract->deposit_required_percent) {{ $contract->deposit_required_percent }}% @endif
        @if($contract->deposit_required_amount) (&#8369;{{ number_format($contract->deposit_required_amount, 2) }}) @endif
        required to confirm this booking.
    </div>
    @endif

    @if($invoice->itineraries->count())
    <div class="section-title">Itinerary</div>
    <table class="data-table">
        <thead><tr><th>Day</th><th>Date</th><th>Location</th><th>Activity</th><th>Meals</th><th>Accommodation</th></tr></thead>
        <tbody>
        @foreach($invoice->itineraries as $day)
            <tr>
                <td>{{ $day->day_number }}</td>
                <td>{{ $day->date?->format('M d, Y') ?? 'TBA' }}</td>
                <td>{{ $day->location ?? '-' }}</td>
                <td>{{ $day->activity_description ?? '-' }}</td>
                <td>{{ $day->meal_plan ?? '-' }}</td>
                <td>{{ $day->accommodation_name ?? '-' }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    @if($invoice->passengers->count())
    <div class="section-title">Passenger / Applicant Roster</div>
    <table class="data-table">
        <thead><tr><th>Name</th><th>Date of Birth</th><th>Passport No.</th><th>Dietary</th><th>Emergency Contact</th></tr></thead>
        <tbody>
        @foreach($invoice->passengers as $p)
            <tr>
                <td>{{ $p->first_name }} {{ $p->last_name }}</td>
                <td>{{ $p->date_of_birth?->format('M d, Y') ?? '-' }}</td>
                <td>{{ $p->passport_number ?? '-' }}</td>
                <td>{{ $p->dietary_restrictions ?? '-' }}</td>
                <td>{{ $p->emergency_contact ?? '-' }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    @if($invoice->paymentSchedules->count())
    <div class="section-title">Payment Schedule</div>
    <table class="data-table">
        <thead><tr><th>Installment</th><th>Due Date</th><th>Amount Due</th><th>Status</th></tr></thead>
        <tbody>
        @foreach($invoice->paymentSchedules as $row)
            <tr>
                <td>{{ $row->installment_number }}</td>
                <td>{{ $row->due_date->format('M d, Y') }}</td>
                <td>&#8369;{{ number_format($row->amount_due, 2) }}</td>
                <td>{{ ucfirst($row->status) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <div style="page-break-before: always;"></div>
    @include('pdf.partials.brand-header', ['documentTitle' => 'Terms and Conditions', 'documentReference' => $contract->contract_number, 'documentDate' => $contract->created_at])

    @php
        $contractTerms = collect(preg_split('/\r\n|\r|\n/', trim((string) $contract->terms_snapshot)))
            ->map(fn ($term) => trim(preg_replace('/^\s*\d+[\.)-]?\s*/', '', $term)))
            ->filter()
            ->values();
    @endphp
    <table class="jvd-data-table">
        <thead><tr><th style="width: 8%; text-align: center;">No.</th><th>Terms and Conditions</th></tr></thead>
        <tbody>
        @forelse($contractTerms as $index => $term)
            <tr><td style="text-align: center; font-weight: 900;">{{ $index + 1 }}</td><td>{{ $term }}</td></tr>
        @empty
            <tr><td style="text-align: center; font-weight: 900;">1</td><td>The services, pricing, schedule, inclusions, and exclusions stated in this agreement form the approved booking scope.</td></tr>
        @endforelse
        </tbody>
    </table>

    <div class="section-title">Cancellation Policy</div>
    <div class="terms-box">
        The required deposit is subject to the cancellation terms stated in this agreement. A cancellation made within three (3) working days of the scheduled trip may result in forfeiture of the deposit. A cancellation made within twenty-four (24) hours of departure may be charged at the full contracted rate. Client-caused cancellation at the pickup point is likewise subject to the agreed cancellation charges.
    </div>

    <div class="section-title">Conduct Rules and Damage Liability</div>
    <div class="terms-box">
        Liquor, illegal drugs, and unsafe conduct are prohibited inside the vehicle. JVD and its service providers may refuse transport to any person who creates a safety risk or serious disruption. The client is responsible for damage caused by members of the traveling party and for securing personal belongings before leaving the vehicle.
    </div>

    <p style="margin: 18px 0 0; text-align: center; font-size: 9px;">By signing below, both parties confirm that they have reviewed and accepted this contract service agreement.</p>
    <table class="signature-block">
        <tr>
            <td style="width: 50%; text-align: center; padding: 0 18px; vertical-align: bottom;">
                @if($contract->signature_image)
                    <img class="signature-img" src="{{ $contract->signature_image }}" alt="Customer signature">
                @else
                    <div style="height: 60px;"></div>
                @endif
                <div style="border-top: 1px solid #1f2937; padding-top: 4px; font-weight: 900;">{{ $contract->signature_typed_name ?: $invoice->customer_name }}</div>
                <div style="font-size: 8px; color: #64748b;">Client printed name / signature @if($contract->signed_at)<br>Signed {{ $contract->signed_at->format('M d, Y h:i A') }}@endif</div>
            </td>
            <td style="width: 50%; text-align: center; padding: 0 18px; vertical-align: bottom;">
                <div style="height: 60px;"></div>
                <div style="border-top: 1px solid #1f2937; padding-top: 4px; font-weight: 900;">Ms. Rhean Umali</div>
                <div style="font-size: 8px; color: #64748b;">Executive Vice President<br>JVD Event &amp; Travel Management Company</div>
            </td>
        </tr>
    </table>
    <div style="margin-top: 24px; text-align: center; font-weight: 900; font-size: 10px;">THANK YOU FOR TRUSTING US. WE ARE HAPPY TO SERVE YOU.</div>
</body>
</html>
