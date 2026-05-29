<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use App\Notifications\SystemAlert;

use Illuminate\Support\Facades\Mail;
use App\Mail\TransactionNotificationMail;
use App\Http\Resources\InvoiceResource;

class BillingController extends Controller
{
    /**
     * Display a listing of invoices.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['customer', 'creator', 'items.service', 'collection']);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%$search%")
                  ->orWhere('customer_name', 'like', "%$search%");
            });
        }

        // Filter by Status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $invoices = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        // Calculate Stats for Dashboard
        $stats = [
            'total_revenue' => Invoice::where('status', 'paid')->sum('total_amount'),
            'pending_amount' => Invoice::where('status', 'pending_payment')->sum('total_amount'),
            'invoice_count' => Invoice::count(),
        ];

        return response()->json([
            'success' => true,
            'data' => InvoiceResource::collection($invoices)->resolve(),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
                'total'        => $invoices->total(),
                'from'         => $invoices->firstItem(),
                'to'           => $invoices->lastItem(),
            ],
            'stats' => $stats
        ]);
    }

    public function getServices()
    {
        $services = Service::with('creator:id,first_name,last_name,email')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $services
        ]);
    }

    public function storeService(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'nullable|string', // Base64 strings
            'child_discount' => 'nullable|numeric|min:0|max:100',
            'has_booking_fields' => 'nullable|boolean',
            'adult_price' => 'nullable|numeric|min:0',
            'child_price' => 'nullable|numeric|min:0',
            'is_tour' => 'nullable|boolean',
            'bus_price' => 'nullable|numeric|min:0',
            'coaster_price' => 'nullable|numeric|min:0',
            'tour_kms' => 'nullable|integer|min:0',
            'tour_hours' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $imageUrls = [];
        if ($request->has('images')) {
            foreach ($request->images as $base64Image) {
                if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
                    $image = substr($base64Image, strpos($base64Image, ',') + 1);
                    $type = strtolower($type[1]); // jpg, png, gif

                    if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                        continue;
                    }

                    $image = str_replace(' ', '+', $image);
                    $imageName = 'services/' . Str::random(10) . '.' . $type;
                    Storage::disk('public')->put($imageName, base64_decode($image));
                    $imageUrls[] = $imageName;
                }
            }
        }

        $service = Service::create([
            'name' => $request->name,
            'category' => $request->category,
            'price' => $request->price,
            'description' => $request->description,
            'images' => $imageUrls,
            'is_active' => true,
            'created_by' => auth()->id(),
            'child_discount' => $request->child_discount ?? 30.00,
            'has_booking_fields' => $request->has_booking_fields ?? false,
            'adult_price' => $request->adult_price,
            'child_price' => $request->child_price,
            'is_tour' => $request->is_tour ?? false,
            'bus_price' => $request->bus_price,
            'coaster_price' => $request->coaster_price,
            'tour_kms' => $request->tour_kms,
            'tour_hours' => $request->tour_hours,
        ]);
        $service->load('creator:id,first_name,last_name,email');

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully',
            'data' => $service
        ], 201);
    }

    /**
     * Update an existing service.
     */
    public function updateService(Request $request, $id)
    {
        $service = Service::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'is_active' => 'nullable|boolean',
            'child_discount' => 'nullable|numeric|min:0|max:100',
            'has_booking_fields' => 'nullable|boolean',
            'adult_price' => 'nullable|numeric|min:0',
            'child_price' => 'nullable|numeric|min:0',
            'is_tour' => 'nullable|boolean',
            'bus_price' => 'nullable|numeric|min:0',
            'coaster_price' => 'nullable|numeric|min:0',
            'tour_kms' => 'nullable|integer|min:0',
            'tour_hours' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $imageUrls = $service->images ?? [];
        if ($request->has('images')) {
            // This logic assumes we send the full array of images we want to keep
            // New images are base64, existing ones are strings (paths)
            $newImageUrls = [];
            foreach ($request->images as $img) {
                if (preg_match('/^data:image\/(\w+);base64,/', $img, $type)) {
                    $image = substr($img, strpos($img, ',') + 1);
                    $type = strtolower($type[1]);
                    $image = str_replace(' ', '+', $image);
                    $imageName = 'services/' . Str::random(10) . '.' . $type;
                    Storage::disk('public')->put($imageName, base64_decode($image));
                    $newImageUrls[] = $imageName;
                } else {
                    // Keep existing path if it's already a URL/path
                    $newImageUrls[] = $img;
                }
            }
            $imageUrls = $newImageUrls;
        }

        $service->update([
            'name' => $request->name,
            'category' => $request->category,
            'price' => $request->price,
            'description' => $request->description,
            'images' => $imageUrls,
            'is_active' => $request->is_active ?? $service->is_active,
            'child_discount' => $request->child_discount ?? $service->child_discount,
            'has_booking_fields' => $request->has_booking_fields ?? $service->has_booking_fields,
            'adult_price' => $request->adult_price ?? $service->adult_price,
            'child_price' => $request->child_price ?? $service->child_price,
            'is_tour' => $request->is_tour ?? $service->is_tour,
            'bus_price' => $request->bus_price ?? $service->bus_price,
            'coaster_price' => $request->coaster_price ?? $service->coaster_price,
            'tour_kms' => $request->tour_kms ?? $service->tour_kms,
            'tour_hours' => $request->tour_hours ?? $service->tour_hours,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully',
            'data' => $service
        ]);
    }

    /**
     * Delete a service.
     */
    public function deleteService($id)
    {
        $service = Service::findOrFail($id);
        
        // Delete associated images
        if ($service->images) {
            foreach ($service->images as $path) {
                Storage::disk('public')->delete($path);
            }
        }
        
        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully'
        ]);
    }

    /**
     * Store a newly created invoice in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_address' => 'nullable|string|max:255',
            'customer_email' => 'nullable|string|email|max:255',
            'customer_contact' => ['nullable', 'string', 'regex:/^(09|\+639|639)\d{9}$/'],
            'payment_method' => 'required|string',
            'payment_type' => 'nullable|string|in:full,downpayment',
            'due_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.adults' => 'nullable|integer',
            'items.*.children' => 'nullable|integer',
            'notes' => 'nullable|string',
        ], [
            'customer_contact.regex' => 'The contact number must be a valid Philippine mobile number.',
            'customer_email.email' => 'The email address must be a valid email format.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $subtotal = 0;
            $taxRate = 0.12; // 12% VAT

            // Calculate totals and validate items
            $processedItems = [];
            foreach ($request->items as $item) {
                $service = Service::find($item['service_id']);
                
                // Allow custom unit price calculated by frontend for bookings (pax base)
                $unitPrice = isset($item['unit_price']) ? (double)$item['unit_price'] : $service->price;
                $itemTotal = $unitPrice * $item['quantity'];
                $subtotal += $itemTotal;
 
                $processedItems[] = [
                    'service_id' => $service->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $itemTotal,
                    'adults' => $item['adults'] ?? null,
                    'children' => $item['children'] ?? null,
                ];
            }

            $taxAmount = $subtotal * $taxRate;
            $totalAmount = $subtotal + $taxAmount;

            $paymentType = $request->payment_type ?? 'full';
            $amountReceived = (double) $request->amount_received;
            
            $balance = 0;
            $status = 'pending_payment';

            if ($request->payment_method === 'Cash') {
                if ($paymentType === 'downpayment') {
                    $status = 'partial';
                    $balance = $totalAmount - $amountReceived;
                } else {
                    $status = 'paid';
                    $balance = 0;
                }
            } else {
                // For GCash/Card, pending until callback
                $status = 'pending_payment';
                $balance = $totalAmount;
            }

            // Create Invoice
            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
                'customer_id' => $request->customer_id,
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address,
                'customer_email' => $request->customer_email,
                'customer_contact' => $request->customer_contact,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'amount_received' => $amountReceived,
                'change' => $request->change ?? 0,
                'payment_method' => $request->payment_method,
                'payment_type' => $paymentType,
                'balance' => max(0, $balance),
                'due_date' => $request->due_date,
                'status' => $status,
                'created_by' => auth()->id() ?? 1,
                'notes' => $request->notes,
            ]);

            // Create Invoice Items
            foreach ($processedItems as $pItem) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $pItem['service_id'],
                    'quantity' => $pItem['quantity'],
                    'unit_price' => $pItem['unit_price'],
                    'total_price' => $pItem['total_price'],
                    'adults' => $pItem['adults'],
                    'children' => $pItem['children'],
                ]);
            }

            // PayMongo Logic "Abang"
            if (in_array($request->payment_method, ['GCash', 'Card'])) {
                $paymongo = new \App\Services\PayMongoService();
                $payData = [
                    'line_items' => array_map(function($item) {
                        $service = Service::find($item['service_id']);
                        $unitPrice = isset($item['unit_price']) ? (double)$item['unit_price'] : $service->price;
                        
                        $displayName = $service->name;
                        if (isset($item['adults']) || isset($item['children'])) {
                            $adultsCount = $item['adults'] ?? 0;
                            $childrenCount = $item['children'] ?? 0;
                            $displayName .= " ({$adultsCount} Adults, {$childrenCount} Children)";
                        }

                        return [
                            'amount' => (int)($unitPrice * 100), // Convert to centavos
                            'currency' => 'PHP',
                            'name' => $displayName,
                            'quantity' => $item['quantity'],
                        ];
                    }, $request->items),
                    'description' => "JVD Order #{$invoice->invoice_number}",
                    'payment_method_types' => $request->payment_method === 'GCash' ? ['gcash'] : ['card']
                ];

                $session = $paymongo->createCheckoutSession($payData);
                if ($session['success']) {
                    $invoice->update([
                        'payment_url' => $session['checkout_url'],
                        'payment_id' => $session['id']
                    ]);
                }
            }

            DB::commit();

            // Synchronize outstanding balance with Collections Ledger
            app(\App\Services\BillingCollectionService::class)->syncCollection($invoice);

            // Dynamically dispatch Invoice / SOA Document to customer via automated email
            if ($invoice->customer_email) {
                try {
                    Mail::to($invoice->customer_email)->send(new TransactionNotificationMail($invoice));
                } catch (\Exception $mailEx) {
                    \Log::error("Failed to send POS transaction email to {$invoice->customer_email}: " . $mailEx->getMessage());
                }
            }

            if ($request->user()) {
                $request->user()->notify(new SystemAlert(
                    'POS Transaction Completed',
                    "Invoice #{$invoice->invoice_number} was successfully created for {$totalAmount} PHP.",
                    'success',
                    '/accounting/billing'
                ));
            }

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => (new InvoiceResource($invoice->load('items.service')))->resolve()
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during transaction processing.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['customer', 'creator', 'items.service'])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => (new InvoiceResource($invoice))->resolve()
        ]);
    }

    /**
     * Update invoice status (e.g., mark as paid).
     */
    public function updateStatus(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->update([
            'status' => $request->status,
        ]);

        app(\App\Services\BillingCollectionService::class)->syncCollection($invoice);

        return response()->json([
            'success' => true,
            'message' => 'Invoice status updated successfully',
            'data' => $invoice
        ]);
    }

    /**
     * Handle PayMongo Webhooks for incoming payments.
     */
    public function handleWebhook(Request $request)
    {
        $signatureHeader = $request->header('paymongo-signature');
        $secret = env('PAYMONGO_WEBHOOK_SECRET');

        if ($secret && $signatureHeader) {
            $parsedSignature = [];
            foreach (explode(',', $signatureHeader) as $part) {
                $p = explode('=', $part, 2);
                if (count($p) === 2) {
                    $parsedSignature[$p[0]] = $p[1];
                }
            }

            if (!isset($parsedSignature['t'])) {
                return response()->json(['error' => 'Invalid signature format'], 401);
            }

            $timestamp = $parsedSignature['t'];
            $signedPayload = $timestamp . '.' . $request->getContent();
            $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

            $isValid = false;
            if (isset($parsedSignature['te']) && hash_equals($expectedSignature, $parsedSignature['te'])) {
                $isValid = true;
            }
            if (isset($parsedSignature['li']) && hash_equals($expectedSignature, $parsedSignature['li'])) {
                $isValid = true;
            }

            if (!$isValid) {
                return response()->json(['error' => 'Invalid webhook signature'], 401);
            }
        }

        $payload = $request->all();

        if (isset($payload['data']['attributes']['type'])) {
            $eventType = $payload['data']['attributes']['type'];

            if ($eventType === 'checkout_session.payment.paid') {
                $sessionData = $payload['data']['attributes']['data']['attributes'] ?? [];
                
                // Usually PayMongo sends the checkout session ID in the event
                // E.g. $sessionData['checkout_session_id']
                // Let's find the invoice by payment_id which we stored as the session ID
                $sessionId = $sessionData['checkout_session_id'] ?? null;

                if (!$sessionId) {
                    // Fallback to checking the payment object id if stored differently
                    $paymentId = $payload['data']['attributes']['data']['id'] ?? null;
                    $invoice = Invoice::where('payment_id', $paymentId)->first();
                } else {
                    $invoice = Invoice::where('payment_id', $sessionId)->first();
                }

                if ($invoice) {
                    $amountPaidCentavos = $sessionData['amount'] ?? 0;
                    $amountPaidPHP = $amountPaidCentavos / 100;

                    // Decrement balance
                    $newBalance = max(0, $invoice->balance - $amountPaidPHP);
                    
                    // Update status: If new balance is 0, status is paid. If > 0, partial.
                    $newStatus = $newBalance <= 0 ? 'paid' : 'partial';

                    $invoice->update([
                        'balance' => $newBalance,
                        'status' => $newStatus,
                        'amount_received' => $invoice->amount_received + $amountPaidPHP,
                    ]);

                    app(\App\Services\BillingCollectionService::class)->syncCollection($invoice);

                    // Send SystemAlert to admins/creator
                    if ($invoice->creator) {
                        $invoice->creator->notify(new SystemAlert(
                            'Payment Received',
                            "Invoice #{$invoice->invoice_number} received a payment of {$amountPaidPHP} PHP. New balance: {$newBalance} PHP.",
                            'success',
                            '/accounting/billing'
                        ));
                    }
                }
            }
        }

        return response()->json(['status' => 'received']);
    }
}
