<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
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
                            <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">JVD</h1>
                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Event and Travel Management Company</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 15px 0; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">{{ $title }}</h2>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0;">
                                Hello <strong style="color: #111827;">{{ $userName }}</strong>,
                            </p>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 25px 0;">
                                {{ $summary }}
                            </p>

                            <!-- Document Details Card -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 30px; border-collapse: separate;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="margin: 0 0 15px 0; font-size: 12px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">Request Specifications</h3>
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            @foreach ($details as $label => $value)
                                                <tr>
                                                    <td width="35%" style="padding: 8px 0; font-size: 13px; color: #6b7280; font-weight: 700; border-bottom: 1px dashed #e5e7eb; vertical-align: top;">{{ $label }}</td>
                                                    <td style="padding: 8px 0 8px 15px; font-size: 13px; color: #111827; font-weight: 800; border-bottom: 1px dashed #e5e7eb; vertical-align: top;">{!! nl2br(e($value)) !!}</td>
                                                </tr>
                                            @endforeach
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Authentication-gated review action -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px; text-align: center;">
                                <tr>
                                    <td align="center" style="padding-bottom: 15px;">
                                        <a href="{{ $reviewUrl }}" style="display: block; width: 80%; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 16px 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2); border: 1px solid #1d4ed8; text-align: center;">
                                            Sign In to Review Request
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 12px; color: #78350f; line-height: 1.5; font-weight: 600;">
                                        <strong>Security Notice</strong><br>
                                        Email links never approve, verify, or reject a request. Sign in, complete two-factor authentication, review the current record, and confirm your decision inside the JVD Management System.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
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
