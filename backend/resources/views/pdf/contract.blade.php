<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Service Contract {{ $contract->contract_number }}</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; color: #333333; margin: 0; padding: 20px; font-size: 11px; line-height: 1.5; }
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
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td class="header-left">
                <div class="company-logo">JVD Event &amp; Travel Management Company</div>
                <div style="margin-top: 6px; font-size: 9px; color: #475569;">
                    UNIT 6 - Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City<br>
                    Phone: 0976 471 1294
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
    <div style="font-size: 9px; color: #475569;">{{ $invoice->customer_email }} &middot; {{ $invoice->customer_contact }}</div>

    @if($contract->deposit_required_amount || $contract->deposit_required_percent)
    <div class="section-title">Deposit</div>
    <div>
        @if($contract->deposit_required_percent) {{ $contract->deposit_required_percent }}% @endif
        @if($contract->deposit_required_amount) (₱{{ number_format($contract->deposit_required_amount, 2) }}) @endif
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
                <td>₱{{ number_format($row->amount_due, 2) }}</td>
                <td>{{ ucfirst($row->status) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <div class="section-title">Terms &amp; Conditions</div>
    <div class="terms-box">{{ $contract->terms_snapshot }}</div>

    @if($contract->isFullySigned())
    <table class="signature-block">
        <tr>
            <td style="width: 50%;">
                <div class="meta-label">Customer Signature</div>
                @if($contract->signature_image)
                    <img class="signature-img" src="{{ $contract->signature_image }}" alt="Signature">
                @endif
                <div style="margin-top: 4px;">{{ $contract->signature_typed_name }}</div>
                <div style="font-size: 8px; color: #64748b;">Signed: {{ $contract->signed_at?->format('M d, Y h:i A') }}</div>
            </td>
        </tr>
    </table>
    @endif
</body>
</html>
