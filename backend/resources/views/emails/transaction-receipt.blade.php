<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JVD Transaction Receipt</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .logo { font-size: 20px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; text-align: center; }
        h1 { font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 20px; color: #ffffff; letter-spacing: -0.5px; }
        p { font-size: 14px; line-height: 1.6; color: #9ca3af; margin-bottom: 24px; }
        .financial-card { background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; margin-bottom: 30px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
        .card-row:last-child { margin-bottom: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px; font-size: 15px; font-weight: bold; }
        .label { color: #9ca3af; }
        .val { color: #ffffff; text-align: right; }
        .unsettled-val { color: #f43f5e; font-weight: 900; }
        .btn-cta { display: block; text-align: center; background: #2563eb; color: #ffffff !important; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); margin-bottom: 30px; }
        .btn-cta:hover { background: #1d4ed8; }
        .footer-note { font-size: 11px; text-align: center; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; }
    </style>
</head>
<body>

    <div class="email-wrapper">
        <div class="logo">JVD Travel & Tours</div>

        @if($invoice->status === 'paid')
            <h1>Payment Settled Successfully!</h1>
            <p>Dear {{ $invoice->customer_name }},</p>
            <p>Thank you for choosing JVD Travel & Tours. We have successfully processed your payment. Attached to this email is your official copy of your printable Invoice <strong>(#{{ $invoice->invoice_number }})</strong> for your records.</p>
        @else
            <h1>Statement of Account Issued</h1>
            <p>Dear {{ $invoice->customer_name }},</p>
            <p>Your partial payment/downpayment has been credited to your transaction ledger. We have generated a <strong>Statement of Account</strong> detailing your remaining balance, which is attached to this email as a PDF document.</p>
            <p>To view your remaining balance and settle the outstanding amount immediately using **GCash**, please click the direct payment routing button below:</p>

            <a href="{{ $invoice->payment_url ?? $gcashLink }}" target="_blank" class="btn-cta">
                📲 Settle Balance via GCash
            </a>
        @endif

        <div class="financial-card">
            <div class="card-row">
                <span class="label">Grand Total:</span>
                <span class="val">PHP {{ number_format($invoice->total_amount, 2) }}</span>
            </div>
            <div class="card-row">
                <span class="label">Amount Paid / Tendered:</span>
                <span class="val" style="color: #10b981;">PHP {{ number_format($invoice->amount_received, 2) }}</span>
            </div>
            @if($invoice->change > 0)
                <div class="card-row">
                    <span class="label">Change Given:</span>
                    <span class="val">PHP {{ number_format($invoice->change, 2) }}</span>
                </div>
            @endif
            <div class="card-row">
                <span class="label">Remaining Balance:</span>
                <span class="val {{ $invoice->balance > 0 ? 'unsettled-val' : '' }}">
                    PHP {{ number_format($invoice->balance, 2) }}
                </span>
            </div>
        </div>

        <p>If you have any questions, feel free to reply directly to this email or reach out to our treasury support team at <strong>accounts@jvd-travel.com</strong>.</p>

        <div class="footer-note">
            This is an automated system-generated billing communication from JVD Travel & Tours Inc. Please do not modify the attachment headers upon reply.
        </div>
    </div>

</body>
</html>
