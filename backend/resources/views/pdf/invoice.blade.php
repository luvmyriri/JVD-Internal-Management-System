<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Official Invoice</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; margin: 0; padding: 20px; font-size: 11px; line-height: 1.5; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .header-left { width: 50%; vertical-align: top; }
        .header-right { width: 50%; text-align: right; vertical-align: top; }
        .company-logo { font-size: 24px; font-weight: 900; color: #1e3a8a; letter-spacing: 1px; margin-bottom: 5px; }
        .document-title { text-align: center; font-size: 16px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #1e293b; margin: 30px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        
        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background-color: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9px; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; }
        .items-table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }

        /* Symmetrical Financial Summary Columns */
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 40px; }
        .summary-col { width: 33.33%; vertical-align: top; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; }
        .summary-title { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
        .summary-row { display: block; width: 100%; margin-bottom: 6px; clear: both; }
        .summary-label { float: left; font-weight: bold; color: #475569; }
        .summary-value { float: right; font-weight: 900; color: #0f172a; }

        /* Footer Positioning */
        .footer { width: 100%; border-top: 1px solid #cbd5e1; padding-top: 20px; margin-top: 50px; font-size: 9px; color: #64748b; }
        .footer-table { width: 100%; border-collapse: collapse; }
        .footer-left { width: 50%; vertical-align: top; }
        .footer-right { width: 50%; text-align: right; vertical-align: top; }
    </style>
</head>
<body>

    <!-- Header Block -->
    <table class="header-table">
        <tr>
            <td class="header-left">
                <div class="company-logo">JVD TRAVEL & TOURS</div>
                <div>Reg No: 912-883-911-000</div>
                <div>UNIT 6 -Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City</div>
                <div>Phone: 0976 471 1294 | Tel: 02 8293 8068</div>
            </td>
            <td class="header-right">
                <h3 style="margin: 0; color: #475569;">OFFICIAL INVOICE</h3>
                <div style="margin-top: 8px; font-weight: bold; color: #0f172a;">{{ $invoice->customer_name }}</div>
                <div>{{ $invoice->customer_address }}</div>
                <div>{{ $invoice->customer_email }}</div>
                <div style="margin-top: 8px; font-size: 10px; font-weight: bold;">Invoice Number: {{ $invoice->invoice_number }}</div>
                <div>Invoice Date: {{ $invoice->created_at->format('M d, Y') }}</div>
            </td>
        </tr>
    </table>

    <div class="document-title">Official Invoice</div>

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Service Description</th>
                <th style="width: 20%;">Date Processed</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Total Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td style="font-weight: bold; color: #0f172a;">
                    {{ $item->service ? $item->service->name : $item->custom_service_name }}
                    <div style="font-size: 8px; color: #64748b; font-weight: normal; margin-top: 2px;">
                        {{ $item->service ? $item->service->category : 'Custom Services' }}
                    </div>
                </td>
                <td>{{ $invoice->created_at->format('M d, Y') }}</td>
                <td style="text-align: center;">{{ $item->quantity }}</td>
                <td style="text-align: right; font-weight: bold; color: #0f172a;">
                    ₱{{ number_format($item->total_price, 2) }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Symmetrical Financial Summary Columns -->
    <table class="summary-table">
        <tr>
            <!-- Left Column: Balances -->
            <td class="summary-col" style="padding-right: 15px;">
                <div class="summary-title">Balances Summary</div>
                <div class="summary-row">
                    <div class="summary-label">Grand Total:</div>
                    <div class="summary-value">₱{{ number_format($invoice->total_amount, 2) }}</div>
                </div>
                <div class="summary-row" style="color: #16a34a;">
                    <div class="summary-label">Amount Paid:</div>
                    <div class="summary-value">₱{{ number_format($invoice->amount_received, 2) }}</div>
                </div>
                @if($invoice->change > 0)
                <div class="summary-row" style="color: #16a34a;">
                    <div class="summary-label">Change Given:</div>
                    <div class="summary-value">₱{{ number_format($invoice->change, 2) }}</div>
                </div>
                @endif
                <div class="summary-row" style="border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 5px;">
                    <div class="summary-label">Unpaid Balance:</div>
                    <div class="summary-value">₱{{ number_format($invoice->balance, 2) }}</div>
                </div>
            </td>

            <!-- Middle Column: Tax Breakdowns -->
            <td class="summary-col" style="padding-left: 15px; padding-right: 15px;">
                <div class="summary-title">Tax Breakdown</div>
                <div class="summary-row">
                    <div class="summary-label">VATable (12%):</div>
                    <div class="summary-value">₱{{ number_format($invoice->subtotal, 2) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">VAT Amount:</div>
                    <div class="summary-value">₱{{ number_format($invoice->tax_amount, 2) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">VAT Exempt:</div>
                    <div class="summary-value">₱0.00</div>
                </div>
            </td>

            <!-- Right Column: Subtotals -->
            <td class="summary-col" style="padding-left: 15px;">
                <div class="summary-title">Total Breakdown</div>
                <div class="summary-row">
                    <div class="summary-label">Subtotal:</div>
                    <div class="summary-value">₱{{ number_format($invoice->subtotal, 2) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">Adjustments:</div>
                    <div class="summary-value">₱0.00</div>
                </div>
                <div class="summary-row" style="border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 5px;">
                    <div class="summary-label">Amount Tendered:</div>
                    <div class="summary-value">₱{{ number_format($invoice->amount_received, 2) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Footer routing details -->
    <div class="footer">
        <table class="footer-table">
            <tr>
                <td class="footer-left">
                    <strong>Payment Receipt Status:</strong><br>
                    This transaction has been settled in full.<br>
                    <strong>Payment Method:</strong> {{ strtoupper($invoice->payment_method) }}<br>
                    <strong>Receipt Generated:</strong> {{ now()->format('Y-m-d H:i:s') }}
                </td>
                <td class="footer-right">
                    <strong>Support & Contacts:</strong><br>
                    Thank you for choosing JVD Travel & Tours!<br>
                    <strong>Support Tel:</strong> 0976 471 1294<br>
                    <strong>Support Email:</strong> accounts@jvd-travel.com
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
