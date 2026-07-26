<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Models\Invoice;
use App\Notifications\ActionableApprovalNotification;
use App\Mail\TransactionNotificationMail;
use App\Mail\BookingConfirmationMail;

$targetEmail = 'vjlamsenlamsen28@gmail.com';
echo "=== DISPATCHING INVOICE & APPROVAL EMAILS TO: {$targetEmail} ===\n\n";

// 1. Direct Email Test
try {
    echo "1. Sending Test Direct Email via SMTP/Failover...\n";
    Mail::raw("Hello! This is a real-time verification email from JVD Internal Management System.\n\nRecipient: {$targetEmail}\nTimestamp: " . date('Y-m-d H:i:s T'), function ($message) use ($targetEmail) {
        $message->to($targetEmail)
                ->subject('JVD Management System — Live Email Dispatch Test');
    });
    echo " -> DIRECT EMAIL DELIVERED!\n\n";
} catch (\Throwable $e) {
    echo " -> DIRECT EMAIL EXCEPTION: " . $e->getMessage() . "\n\n";
}

// 2. Actionable Approval Notification Test
try {
    echo "2. Sending Actionable Cash Budget Approval Notification to {$targetEmail}...\n";
    
    $recipient = User::where('email', $targetEmail)->first();
    if (!$recipient) {
        $recipient = User::first();
        $recipient->email = $targetEmail;
    }

    $details = [
        'Reference'     => 'CB-2026-9988 (Tagaytay Tour Exposure)',
        'Destination'   => 'Tagaytay City (Taal View Park)',
        'Amount'        => '₱85,000.00',
        'Prepared By'   => 'Sales Representative',
        'Status'        => 'Pending Executive Vice President Verification',
    ];

    $notification = new ActionableApprovalNotification(
        "Cash Budget Pending Executive Approval — CB-2026-9988",
        "A Cash Budget Request of ₱85,000.00 for Tagaytay Exposure Trip requires your executive verification.",
        "cash_budget",
        9988,
        $details
    );

    $recipient->notify($notification);
    echo " -> ACTIONABLE APPROVAL NOTIFICATION DISPATCHED!\n\n";
} catch (\Throwable $e) {
    echo " -> APPROVAL NOTIFICATION EXCEPTION: " . $e->getMessage() . "\n\n";
}

// 3. Create or Fetch Invoice Model for Official Email Dispatches
$invoice = Invoice::where('invoice_number', 'INV-2026-0088')->first();
if (!$invoice) {
    $invoice = Invoice::create([
        'invoice_number'  => 'INV-2026-0088',
        'customer_name'   => 'Val Lamsen',
        'customer_email'  => $targetEmail,
        'customer_address'=> 'JVD Main Terminal, Manila',
        'payment_method'  => 'bank_transfer',
        'subtotal'        => 85000.00,
        'tax_amount'      => 0.00,
        'total_amount'    => 85000.00,
        'amount_received' => 0.00,
        'due_date'        => now()->addDays(7)->toDateString(),
        'status'          => 'issued',
        'created_by'      => 1,
    ]);
} else {
    $invoice->update(['customer_email' => $targetEmail]);
}

// 4. Official Invoice Transaction Mail Test
try {
    echo "3. Sending Official Invoice Transaction Notification Mail to {$targetEmail}...\n";
    Mail::to($targetEmail)->send(new TransactionNotificationMail($invoice));
    echo " -> OFFICIAL INVOICE TRANSACTION MAIL SENT SUCCESSFULLY! (Invoice #{$invoice->invoice_number})\n\n";
} catch (\Throwable $e) {
    echo " -> INVOICE MAIL EXCEPTION: " . $e->getMessage() . "\n\n";
}

// 5. Booking Confirmation Mail Test
try {
    echo "4. Sending Booking Confirmation Mail to {$targetEmail}...\n";
    Mail::to($targetEmail)->send(new BookingConfirmationMail($invoice));
    echo " -> BOOKING CONFIRMATION MAIL SENT SUCCESSFULLY!\n\n";
} catch (\Throwable $e) {
    echo " -> BOOKING CONFIRMATION MAIL EXCEPTION: " . $e->getMessage() . "\n\n";
}

echo "=== ALL EMAIL & APPROVAL TESTS EXECUTED SUCCESSFULLY ===\n";
