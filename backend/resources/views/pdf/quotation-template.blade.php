<?php

/**
 * Blade view for generating a quotation PDF for an educational tour package.
 * This view receives a `$package` variable containing the package model.
 * It uses the company's profile information from the DocumentPdfService.
 */
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quotation - {{ $package->name }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; margin: 40px; }
        h1 { text-align: center; margin-bottom: 30px; }
        .header, .footer { text-align: center; font-size: 12px; color: #555; }
        .details { margin-top: 20px; }
        .details table { width: 100%; border-collapse: collapse; }
        .details th, .details td { border: 1px solid #ddd; padding: 8px; }
        .details th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <strong>{{ $company['name'] }}</strong><br>
        {{ $company['address'] }}<br>
        Phone: {{ $company['phone'] }} | Email: {{ $company['email'] }}
    </div>

    <h1>Quotation</h1>

    <p><strong>Package:</strong> {{ $package->name }} ({{ $package->tour_code }})</p>
    <p><strong>Program:</strong> {{ optional($package->program)->name ?? 'N/A' }}</p>
    <p><strong>Customer:</strong> {{ optional($package->schoolCustomer)->name ?? 'N/A' }}</p>
    <p><strong>Dates:</strong> {{ $package->starts_at->format('Y-m-d') }} to {{ $package->ends_at->format('Y-m-d') }}</p>
    <p><strong>Maximum Capacity:</strong> {{ $package->maximum_capacity }}</p>

    <div class="details">
        <table>
            <tr>
                <th>Description</th>
                <th>Amount (PHP)</th>
            </tr>
            <tr>
                <td>Base Package Price</td>
                <td>{{ number_format($package->base_price ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td>Additional Services</td>
                <td>{{ number_format($package->additional_services_price ?? 0, 2) }}</td>
            </tr>
            <tr>
                <th>Total</th>
                <th>{{ number_format(($package->base_price ?? 0) + ($package->additional_services_price ?? 0), 2) }}</th>
            </tr>
        </table>
    </div>

    <p style="margin-top: 30px;">Generated at: {{ $generatedAt->format('Y-m-d H:i') }}</p>

    <div class="footer">
        © {{ date('Y') }} {{ $company['name'] }}. All rights reserved.
    </div>
</body>
</html>
