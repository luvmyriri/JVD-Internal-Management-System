<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Required: Review &amp; Sign Your JVD Contract</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 50px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
                            @php
                                $logoPath = file_exists(public_path('JVD 3D.png'))
                                    ? public_path('JVD 3D.png')
                                    : (file_exists(public_path('JVDlogo-removebg-preview.png'))
                                        ? public_path('JVDlogo-removebg-preview.png')
                                        : (file_exists(base_path('../frontend/public/JVD 3D.png'))
                                            ? base_path('../frontend/public/JVD 3D.png')
                                            : null));
                            @endphp
                            @if($logoPath && isset($message))
                                <img src="{{ $message->embed($logoPath) }}" alt="JVD Logo" height="64" style="display: block; margin: 0 auto 15px auto;">
                            @endif
                            <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 950; letter-spacing: -0.5px;">JVD</h1>
                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Event and Travel Management Company</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; line-height: 1.3;">Action Required: Review &amp; Sign Your Contract</h2>

                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                                Hello <strong style="color: #111827;">{{ $contract->invoice->customer_name }}</strong>,
                            </p>

                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0;">
                                Your booking with JVD Event &amp; Travel Management Company is almost confirmed. Please review and sign your service contract to finalize your booking.
                            </p>

                            <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 30px;">
                                <tr>
                                    <td width="50%" style="font-size: 13px; color: #4b5563; line-height: 1.5; border-right: 1px solid #e5e7eb;">
                                        <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Contract No.</span><br>
                                        <strong style="color: #111827; font-size: 14px;">{{ $contract->contract_number }}</strong>
                                    </td>
                                    <td width="50%" style="font-size: 13px; color: #4b5563; line-height: 1.5; padding-left: 20px;">
                                        <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount</span><br>
                                        <strong style="color: #111827; font-size: 14px;">₱{{ number_format($contract->invoice->total_amount, 2) }}</strong>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $signingLink }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2); border: 1px solid #1d4ed8;">
                                            Review &amp; Sign Contract
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="font-size: 12px; line-height: 1.6; color: #9ca3af; margin: 0 0 12px 0; text-align: center;">
                                Note: This link is secure and unique to your booking. Please do not share this email.
                            </p>

                            <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0; text-align: center; border-top: 1px dashed #e5e7eb; padding-top: 20px;">
                                If you have any questions, please feel free to reach out to our Sales Team.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px 40px; text-align: center;">
                            @include('emails.partials.footer')
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
