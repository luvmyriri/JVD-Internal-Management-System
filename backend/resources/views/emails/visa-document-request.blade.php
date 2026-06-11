@php
    $isPassport = $passportCase->case_type === 'passport';
    $themeColor = $isPassport ? '#2563eb' : '#7c3aed';
    $themeColorDark = $isPassport ? '#1d4ed8' : '#6d28d9';
    $shadowColor = $isPassport ? 'rgba(37, 99, 235, 0.2)' : 'rgba(124, 58, 237, 0.2)';
    $typeLabel = $isPassport ? 'Passport' : 'Visa';
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Required: Upload {{ $typeLabel }} Application Documents</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 50px 0;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
                            @if(file_exists(base_path('../frontend/public/JVD 3D.png')))
                                <img src="{{ $message->embed(base_path('../frontend/public/JVD 3D.png')) }}" alt="JVD Logo" height="64" style="display: block; margin: 0 auto 15px auto;">
                            @endif
                            <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 950; letter-spacing: -0.5px;">JVD</h1>
                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Event and Travel Management Company</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; line-height: 1.3;">Action Required: Submit Supporting Documents for {{ $typeLabel }} Case #{{ $passportCase->id }}</h2>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                                Hello <strong style="color: #111827;">{{ $passportCase->customer->first_name }} {{ $passportCase->customer->last_name }}</strong>,
                            </p>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0;">
                                JVD Travel Operations is currently preparing the {{ strtolower($typeLabel) }} application files. Please review the passenger details and submit the requested files online.
                            </p>

                            <!-- Details Card -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 30px;">
                                <tr>
                                    <td width="50%" style="font-size: 13px; color: #4b5563; line-height: 1.5; border-right: 1px solid #e5e7eb;">
                                        <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Passenger Name</span><br>
                                        <strong style="color: #111827; font-size: 14px;">{{ $passportCase->passenger->first_name }} {{ $passportCase->passenger->last_name }}</strong>
                                    </td>
                                    <td width="50%" style="font-size: 13px; color: #4b5563; line-height: 1.5; padding-left: 20px;">
                                        @if($isPassport)
                                            <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Service Type</span><br>
                                            <strong style="color: #111827; font-size: 14px;">Passport Processing Service</strong>
                                        @else
                                            <span style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Destination & Category</span><br>
                                            <strong style="color: #111827; font-size: 14px;">{{ strtoupper($passportCase->destination_country) }} — {{ $passportCase->visa_type }} Visa</strong>
                                        @endif
                                    </td>
                                </tr>
                            </table>

                            <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Required Documents Checklist</h3>
                            
                            <!-- Requested Documents List -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px; border-left: 3px solid {{ $themeColor }}; padding-left: 20px;">
                                @foreach($requestedDocs as $doc)
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #1f2937; line-height: 1.5; font-weight: 600;">
                                            <span style="color: {{ $themeColor }}; font-weight: 900; margin-right: 10px;">✓</span> {{ $doc }}
                                        </td>
                                    </tr>
                                @endforeach
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $link }}" style="display: inline-block; background-color: {{ $themeColor }}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 6px -1px {{ $shadowColor }}, 0 2px 4px -2px {{ $shadowColor }}; border: 1px solid {{ $themeColorDark }};">
                                            Upload Documents Online
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="font-size: 12px; line-height: 1.6; color: #9ca3af; margin: 0 0 12px 0; text-align: center;">
                                Note: This link is secure and unique to your {{ strtolower($typeLabel) }} case application. Please do not share this email.
                            </p>
                            
                            <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0; text-align: center; border-top: 1px dashed #e5e7eb; padding-top: 20px;">
                                If you have any questions or require assistance, please feel free to reach out to our Travel Assistance Team.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
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
