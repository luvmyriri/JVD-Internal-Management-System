<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Mail\CustomerOutreachMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class CustomerEmailController extends Controller
{
    public function send(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        if (empty($customer->email)) {
            return response()->json(['message' => 'Customer has no email address.'], 400);
        }

        try {
            Mail::to($customer->email)->send(
                new CustomerOutreachMail($customer, $validated['subject'], $validated['message'])
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send outreach email to {$customer->email}: " . $e->getMessage());
            return response()->json(['message' => 'Failed to send email: ' . $e->getMessage()], 502);
        }

        return response()->json(['message' => 'Email sent successfully.']);
    }
}
