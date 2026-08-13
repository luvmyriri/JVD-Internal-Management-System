<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your JVD Service Contract</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="padding:36px 12px;background:#f3f4f6;"><tr><td align="center">
    <table width="600" cellspacing="0" cellpadding="0" role="presentation" style="max-width:600px;width:100%;overflow:hidden;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;">
        <tr><td style="padding:28px 32px;background:#071b33;color:#ffffff;"><strong style="font-size:20px;">JVD Event &amp; Travel Management Co.</strong><div style="margin-top:6px;font-size:12px;color:#cbd5e1;">Service contract for {{ $contract->invoice->invoice_number }}</div></td></tr>
        <tr><td style="padding:32px;">
            <h1 style="margin:0 0 18px;font-size:22px;color:#111827;">Your service contract is attached</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">Hello <strong>{{ $contract->invoice->customer_name ?: 'Customer' }}</strong>,</p>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4b5563;">Attached is contract <strong>{{ $contract->contract_number }}</strong> for your JVD travel transaction. This copy records the agreed services, pricing, itinerary, and applicable terms.</p>
            <table width="100%" cellspacing="0" cellpadding="12" role="presentation" style="border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
                <tr><td style="font-size:12px;color:#6b7280;">Invoice</td><td align="right" style="font-size:13px;font-weight:bold;color:#111827;">{{ $contract->invoice->invoice_number }}</td></tr>
                <tr><td style="font-size:12px;color:#6b7280;">Contract total</td><td align="right" style="font-size:13px;font-weight:bold;color:#111827;">PHP {{ number_format($contract->invoice->total_amount, 2) }}</td></tr>
            </table>
            <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">No electronic signature is required to complete checkout. If your arrangement requires a signed copy, you may sign the attached document manually and return it to the JVD team.</p>
        </td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:11px;color:#6b7280;">@include('emails.partials.footer')</td></tr>
    </table>
</td></tr></table>
</body>
</html>
