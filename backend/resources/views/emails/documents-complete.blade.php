@php
    $related = $portalToken->related();
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Required Documents Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 50px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
                            @if(file_exists(base_path('../frontend/public/JVD 3D.png')))
                                <img src="{{ $message->embed(base_path('../frontend/public/JVD 3D.png')) }}" alt="JVD Logo" height="64" style="display: block; margin: 0 auto 15px auto;">
                            @endif
                            <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 950; letter-spacing: -0.5px;">JVD</h1>
                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Event and Travel Management Company</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; line-height: 1.3;">✓ All Documents Received</h2>

                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                                Hello,
                            </p>

                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0;">
                                Thank you — we have received all the documents you submitted. Our team will now review your submission and reach out if anything further is needed.
                            </p>

                            <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0; text-align: center; border-top: 1px dashed #e5e7eb; padding-top: 20px;">
                                If you have any questions, please feel free to reach out to our team.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: 700;">
                                &copy; {{ date('Y') }} JVD Event and Travel Management Company
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                This is an automated system message.<br>Please do not reply directly to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
