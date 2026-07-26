<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JVD Transaction Receipt</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #f1f5f9; 
            color: #334155; 
            margin: 0; 
            padding: 40px 0; 
            -webkit-font-smoothing: antialiased; 
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
            border: 1px solid #e2e8f0;
        }
        .header {
            background-color: #0f172a;
            padding: 30px 40px;
            text-align: center;
        }
        .logo-img {
            height: 64px;
            width: auto;
            display: block;
            margin: 0 auto 10px auto;
        }
        .brand-name {
            font-size: 18px;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        }
        .brand-sub {
            font-size: 10px;
            font-weight: 600;
            color: #3b82f6;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-top: 4px;
        }
        .content-body {
            padding: 40px;
        }
        .status-banner {
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .status-success {
            background-color: #dcfce7;
            border: 1px solid #bbf7d0;
            color: #15803d;
        }
        .status-warning {
            background-color: #fef3c7;
            border: 1px solid #fde68a;
            color: #b45309;
        }
        .status-banner h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        h3 {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 0;
            margin-bottom: 15px;
        }
        p {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .financial-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 30px;
        }
        .financial-table {
            width: 100%;
            border-collapse: collapse;
        }
        .financial-table td {
            padding: 8px 0;
            font-size: 13px;
            color: #475569;
        }
        .financial-table tr.total-row td {
            padding-top: 14px;
            border-top: 1px dashed #cbd5e1;
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
        }
        .text-right {
            text-align: right;
            font-weight: 700;
        }
        .val-highlight {
            color: #16a34a;
        }
        .val-unsettled {
            color: #dc2626;
        }
        .btn-cta {
            display: block;
            text-align: center;
            background-color: #2563eb;
            color: #ffffff !important;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            text-decoration: none;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.15);
            margin: 30px 0;
        }
        .btn-cta:hover {
            background-color: #1d4ed8;
        }
        .support-info {
            font-size: 12px;
            color: #64748b;
            text-align: center;
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 15px;
            margin-top: 30px;
            border: 1px solid #f1f5f9;
        }
        .footer-note {
            font-size: 11px;
            text-align: center;
            color: #94a3b8;
            padding: 30px 40px;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            line-height: 1.5;
        }
    </style>
</head>
<body>

    <div class="email-container">
        <!-- Brand Header -->
        <div class="header">
            <img src="{{ $message->embed(public_path('JVDlogo-removebg-preview.png')) }}" alt="JVD Logo" class="logo-img">
            <div class="brand-name">JVD Event & Travel</div>
            <div class="brand-sub">Management Company</div>
        </div>

        <div class="content-body">
            @if($invoice->status === 'paid')
                <!-- Status Banner: Paid -->
                <div class="status-banner status-success">
                    <h2>Payment Settled Successfully</h2>
                </div>

                <h3>Dear {{ $invoice->customer_name }},</h3>
                <p>Thank you for choosing JVD Event & Travel Management Company. We have successfully processed and verified your payment.</p>
                <p>Attached to this email, please find the official copy of your printable Invoice / Receipt <strong>(#{{ $invoice->invoice_number }})</strong> for your records.</p>
            @else
                <!-- Status Banner: Partial -->
                <div class="status-banner status-warning">
                    <h2>Statement of Account Issued</h2>
                </div>

                <h3>Dear {{ $invoice->customer_name }},</h3>
                <p>Your partial payment / downpayment has been successfully credited to your transaction ledger.</p>
                <p>We have generated a <strong>Statement of Account (SOA)</strong> detailing your remaining balance and payment history, which is attached to this email as a PDF document.</p>
                <p>To settle the outstanding balance conveniently online via **GCash**, please click the direct payment button below:</p>

                <a href="{{ $invoice->payment_url ?? $gcashLink }}" target="_blank" class="btn-cta">
                    📲 Settle Balance via GCash
                </a>
            @endif

            @if($invoice->booking?->travel_date || $invoice->booking?->bus_id || $invoice->booking?->driver_id || $invoice->booking?->tour_code || $invoice->booking?->pickup_location || $invoice->booking?->pax_count)
            <!-- Travel & Assignment Details -->
            <div class="financial-card" style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px;">📅 Travel &amp; Assignment Specifications</h4>
                <table class="financial-table">
                    @if($invoice->booking?->travel_date)
                    <tr>
                        <td>Travel Date:</td>
                        <td class="text-right" style="color: #0f172a;">{{ \Carbon\Carbon::parse($invoice->booking->travel_date)->format('F d, Y') }}</td>
                    </tr>
                    @endif
                    @if($invoice->booking?->tour_code)
                    <tr>
                        <td>Tour/Joiner Code:</td>
                        <td class="text-right" style="color: #0f172a;">{{ $invoice->booking->tour_code }}</td>
                    </tr>
                    @endif
                    @if($invoice->booking?->pax_count)
                    <tr>
                        <td>Pax Count:</td>
                        <td class="text-right" style="color: #0f172a;">{{ $invoice->booking->pax_count }} Pax</td>
                    </tr>
                    @endif
                    @if($invoice->booking?->pickup_location)
                    <tr>
                        <td>Pickup Location:</td>
                        <td class="text-right" style="color: #0f172a;">{{ $invoice->booking->pickup_location }}</td>
                    </tr>
                    @endif
                    @if($invoice->bus)
                    <tr>
                        <td>Bus Assigned:</td>
                        <td class="text-right" style="color: #0f172a;">{{ $invoice->bus->plate_number }} ({{ $invoice->bus->model }})</td>
                    </tr>
                    @endif
                    @if($invoice->driver)
                    <tr>
                        <td>Driver Assigned:</td>
                        <td class="text-right" style="color: #0f172a;">{{ $invoice->driver->first_name }} {{ $invoice->driver->last_name }}</td>
                    </tr>
                    @endif
                    @if($invoice->booking?->seat_map && count($invoice->booking->seat_map) > 0)
                    <tr>
                        <td>Selected Seats:</td>
                        <td class="text-right" style="color: #0f172a;">{{ implode(', ', $invoice->booking->seat_map) }}</td>
                    </tr>
                    @endif
                </table>
            </div>
            @endif

            <!-- Invoice Summary Table -->
            <div class="financial-card">
                <table class="financial-table">
                    <tr>
                        <td>Invoice Number:</td>
                        <td class="text-right" style="color: #0f172a;">#{{ $invoice->invoice_number }}</td>
                    </tr>
                    <tr>
                        <td>Grand Total (VAT-inclusive):</td>
                        <td class="text-right" style="color: #0f172a;">PHP {{ number_format($invoice->total_amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td>Amount Paid / Tendered:</td>
                        <td class="text-right val-highlight">PHP {{ number_format($invoice->amount_received, 2) }}</td>
                    </tr>
                    @if($invoice->change > 0)
                        <tr>
                            <td>Change Given:</td>
                            <td class="text-right" style="color: #0f172a;">PHP {{ number_format($invoice->change, 2) }}</td>
                        </tr>
                    @endif
                    <tr class="total-row">
                        <td>Remaining Balance:</td>
                        <td class="text-right {{ $invoice->balance > 0 ? 'val-unsettled' : 'val-highlight' }}">
                            PHP {{ number_format($invoice->balance, 2) }}
                        </td>
                    </tr>
                </table>
            </div>

            <div class="support-info">
                If you have any questions, feel free to reply directly to this email or reach out to our treasury support team at <a href="mailto:accounts@jvd-travel.com" style="color: #2563eb; text-decoration: none; font-weight: bold;">accounts@jvd-travel.com</a>.
            </div>
        </div>

        <div style="padding: 24px 20px 8px 20px;">
            @include('emails.partials.footer')
        </div>
    </div>

</body>
</html>
