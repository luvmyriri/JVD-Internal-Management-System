<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $customSubject }}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 50px 0;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
                            <img src="{{ $message->embed(base_path('../frontend/public/JVD 3D.png')) }}" alt="JVD Logo" height="64" style="display: block; margin: 0 auto 15px auto;">
                            <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">JVD</h1>
                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Events and Travel Management, Co.</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">{{ $customSubject }}</h2>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                                Hello <strong style="color: #111827;">{{ $customer->first_name }} {{ $customer->last_name }}</strong>,
                            </p>
                            
                            <div style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0; white-space: pre-wrap;">{{ $customMessage }}</div>

                            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0 0 12px 0;">
                                If you require any further assistance, please feel free to reply directly to this email or contact the JVD Customer Support Team.
                            </p>
                            
                            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
                                Thank you for choosing JVD Events and Travel Management!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: 700;">
                                &copy; {{ date('Y') }} JVD Events & Travels Management Co.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                This message was sent securely via the JVD Internal Management System.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
