<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Required: Upload Verification Documents</title>
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
                            <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">Action Required: Business Accreditation Requirements</h2>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                                Hello <strong style="color: #111827;">{{ $accreditation->contact_person }}</strong>,
                            </p>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0;">
                                As part of the official accreditation process for <strong style="color: #111827; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">{{ $accreditation->entity_name }}</strong> <span style="color: #6b7280; font-size: 13px;">({{ ucfirst($accreditation->entity_type) }})</span>, we kindly request that you securely upload your required accreditation and verification documents.
                            </p>

                            <!-- Alert Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 8px; margin-bottom: 35px;">
                                <tr>
                                    <td style="padding: 16px; font-size: 14px; color: #1e3a8a; line-height: 1.6;">
                                        <strong style="color: #1d4ed8; display: block; margin-bottom: 4px;">Why is this needed?</strong> 
                                        Maintaining up-to-date compliance records ensures seamless operations and partnership continuity with JVD Management.
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $link }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2); border: 1px solid #1d4ed8;">
                                            Securely Upload Documents
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0 0 12px 0;">
                                The link above is unique to your organization and is secured using end-to-end encryption. Please do not share it.
                            </p>
                            
                            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
                                If you require assistance, please contact the JVD Procurement & Compliance Team.
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
