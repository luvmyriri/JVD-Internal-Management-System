<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>JVD Statement of Account</title>
</head>
<body style="margin:0;background:#f1f5f9;color:#334155;font-family:Arial,sans-serif;padding:32px 12px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#0f172a;color:#ffffff;padding:24px 32px;">
            <div style="font-size:18px;font-weight:800;">JVD Event &amp; Travel</div>
            <div style="margin-top:4px;color:#93c5fd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Statement of Account</div>
        </div>
        <div style="padding:32px;">
            <p style="margin:0 0 18px;line-height:1.6;">Dear {{ $invoice->customer_name }},</p>
            <p style="margin:0 0 18px;line-height:1.6;">Your current statement of account for reference <strong>{{ $invoice->invoice_number }}</strong> is attached as a PDF.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;">
                <div style="font-size:13px;line-height:1.8;">Total: <strong>PHP {{ number_format($invoice->total_amount, 2) }}</strong></div>
                <div style="font-size:13px;line-height:1.8;">Paid: <strong>PHP {{ number_format($invoice->amount_received, 2) }}</strong></div>
                <div style="font-size:13px;line-height:1.8;">Balance: <strong>PHP {{ number_format($invoice->balance, 2) }}</strong></div>
            </div>
            <p style="margin:18px 0 0;line-height:1.6;">Please contact JVD Accounting before remitting funds to confirm the currently authorized payment channels.</p>
        </div>
    </div>
</body>
</html>
