<?php

namespace App\Services;

use App\Exceptions\MaxPaxExceededException;
use App\Http\Requests\Accounting\StoreInvoiceRequest;
use App\Http\Requests\Accounting\StoreServiceRequest;
use App\Http\Requests\Accounting\UpdateInvoiceStatusRequest;
use App\Http\Requests\Accounting\UpdateServiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Jobs\SendInvoiceDocumentsJob;
use App\Models\Booking;
use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Customer;
use App\Models\CustomTransactionDetail;
use App\Models\IntegrationEvent;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePassenger;
use App\Models\Itinerary;
use App\Models\Service;
use App\Notifications\SystemAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BillingService
{
    /**
     * Display a listing of invoices.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(Invoice::operationalDocumentRelations());

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%$search%")
                    ->orWhere('customer_name', 'like', "%$search%");
            });
        }

        // Filter by Status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by issue-date range (inclusive) for the shared timeframe filter.
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $invoices = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        // Calculate Stats for Dashboard (cash-basis, consistent with reports).
        // total_revenue = money actually collected (paid in full + partial deposits);
        // pending_amount = outstanding receivables still owed across all open invoices.
        $stats = [
            'total_revenue' => (float) Invoice::revenueBearing()->sum(Invoice::collectedRevenueExpr()),
            'pending_amount' => (float) Invoice::whereIn('status', ['partial', 'pending_payment'])
                ->sum(DB::raw('COALESCE(balance, 0)')),
            'invoice_count' => Invoice::count(),
        ];

        return response()->json([
            'success' => true,
            'data' => InvoiceResource::collection($invoices)->resolve(),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
                'from' => $invoices->firstItem(),
                'to' => $invoices->lastItem(),
            ],
            'stats' => $stats,
        ]);
    }

    public function getServices()
    {
        $services = Service::with('creator:id,first_name,last_name,email', 'bus:id,plate_number,model,seating_capacity', 'driver:id,first_name,last_name')
            ->where('is_active', true)
            ->where('is_sales_catalog', true)
            ->get();

        // Strip cost_breakdown from non-admin/super_admin users
        $userRole = auth()->user()?->role;
        if (! in_array($userRole, ['super_admin', 'admin'])) {
            $services->makeHidden('cost_breakdown');
        }

        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }

    public function getServiceOccupancy(Request $request, $id)
    {
        $service = Service::findOrFail($id);
        $travelDate = $request->query('travel_date');

        if (! $travelDate) {
            return response()->json([
                'success' => false,
                'message' => 'Travel date is required',
            ], 400);
        }

        $totalBooked = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->leftJoin('bookings', 'invoices.id', '=', 'bookings.invoice_id')
            ->where('invoice_items.service_id', $service->id)
            ->where('bookings.travel_date', $travelDate)
            ->where('invoices.status', '!=', 'cancelled')
            ->sum(DB::raw('CASE WHEN invoice_items.adults IS NOT NULL OR invoice_items.children IS NOT NULL THEN COALESCE(invoice_items.adults, 0) + COALESCE(invoice_items.children, 0) ELSE invoice_items.quantity END'));

        return response()->json([
            'success' => true,
            'service_id' => $service->id,
            'travel_date' => $travelDate,
            'total_booked' => (int) $totalBooked,
            'max_pax' => $service->max_pax,
        ]);
    }

    public function storeService(StoreServiceRequest $request)
    {
        $validated = $request->validated();

        $imageUrls = [];
        if ($request->has('images')) {
            foreach ($request->images as $base64Image) {
                if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
                    $image = substr($base64Image, strpos($base64Image, ',') + 1);
                    $type = strtolower($type[1]); // jpg, png, gif

                    if (! in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                        continue;
                    }

                    $image = str_replace(' ', '+', $image);
                    $imageName = 'services/'.Str::random(10).'.'.$type;
                    Storage::disk('public')->put($imageName, base64_decode($image));
                    $imageUrls[] = $imageName;
                }
            }
        }

        $service = Service::create([
            'name' => $request->name,
            'category' => $request->category,
            'service_type' => $request->service_type,
            'package_config' => $request->package_config,
            'price' => $request->price,
            'description' => $request->description,
            'images' => $imageUrls,
            'is_active' => true,
            'is_sales_catalog' => $request->boolean('is_sales_catalog', true),
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
            'cost_breakdown' => $request->cost_breakdown,
            'inclusions' => $request->inclusions,
            'exclusions' => $request->exclusions,
            'max_pax' => $request->max_pax,
            'fixed_date' => $request->fixed_date,
            'fixed_departure_time' => $request->fixed_departure_time,
            'fixed_arrival_datetime' => $request->fixed_arrival_datetime,
            'bus_id' => $request->bus_id,
            'driver_id' => $request->driver_id,
        ]);
        $service->load('creator:id,first_name,last_name,email', 'bus:id,plate_number,model,seating_capacity', 'driver:id,first_name,last_name');

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully',
            'data' => $service,
        ], 201);
    }

    /**
     * Update an existing service.
     */
    public function updateService(UpdateServiceRequest $request, $id)
    {
        $service = Service::findOrFail($id);

        $validated = $request->validated();

        $imageUrls = $service->images ?? [];
        if ($request->has('images')) {
            // New images are base64, existing ones are relative paths or external URLs
            $newImageUrls = [];
            foreach ($request->images as $img) {
                if (empty($img)) {
                    continue;
                }
                if (preg_match('/^data:image\/(\w+);base64,/', $img, $type)) {
                    $image = substr($img, strpos($img, ',') + 1);
                    $ext = strtolower($type[1]);
                    if ($ext === 'jpeg') {
                        $ext = 'jpg';
                    }
                    $image = str_replace(' ', '+', $image);
                    $imageName = 'services/'.Str::random(10).'.'.$ext;
                    Storage::disk('public')->put($imageName, base64_decode($image));
                    $newImageUrls[] = $imageName;
                } else {
                    $cleanPath = $img;
                    if (is_string($img)) {
                        if (preg_match('/^https?:\/\//i', $img)) {
                            if (preg_match('/\/storage\/(.+)$/i', $img, $matches)) {
                                $cleanPath = $matches[1];
                            } else {
                                $cleanPath = $img;
                            }
                        } else {
                            $cleanPath = preg_replace('/^(?:\/storage\/|\/public\/|storage\/|public\/)+/i', '', $img);
                        }
                    }
                    if (! empty($cleanPath)) {
                        $newImageUrls[] = $cleanPath;
                    }
                }
            }
            $imageUrls = array_values($newImageUrls);
        }

        $service->update([
            'name' => $request->name,
            'category' => $request->category,
            'service_type' => $request->service_type ?? $service->service_type,
            'package_config' => $request->package_config ?? $service->package_config,
            'price' => $request->price,
            'description' => $request->description,
            'images' => $imageUrls,
            'is_active' => $request->is_active ?? $service->is_active,
            'is_sales_catalog' => $request->is_sales_catalog ?? $service->is_sales_catalog,
            'child_discount' => $request->child_discount ?? $service->child_discount,
            'has_booking_fields' => $request->has_booking_fields ?? $service->has_booking_fields,
            'adult_price' => $request->adult_price ?? $service->adult_price,
            'child_price' => $request->child_price ?? $service->child_price,
            'is_tour' => $request->is_tour ?? $service->is_tour,
            'bus_price' => $request->bus_price ?? $service->bus_price,
            'coaster_price' => $request->coaster_price ?? $service->coaster_price,
            'tour_kms' => $request->tour_kms ?? $service->tour_kms,
            'tour_hours' => $request->tour_hours ?? $service->tour_hours,
            'cost_breakdown' => array_key_exists('cost_breakdown', $request->all()) ? $request->cost_breakdown : $service->cost_breakdown,
            'inclusions' => array_key_exists('inclusions', $request->all()) ? $request->inclusions : $service->inclusions,
            'exclusions' => array_key_exists('exclusions', $request->all()) ? $request->exclusions : $service->exclusions,
            'max_pax' => array_key_exists('max_pax', $request->all()) ? $request->max_pax : $service->max_pax,
            'fixed_date' => array_key_exists('fixed_date', $request->all()) ? $request->fixed_date : $service->fixed_date,
            'fixed_departure_time' => array_key_exists('fixed_departure_time', $request->all()) ? $request->fixed_departure_time : $service->fixed_departure_time,
            'fixed_arrival_datetime' => array_key_exists('fixed_arrival_datetime', $request->all()) ? $request->fixed_arrival_datetime : $service->fixed_arrival_datetime,
            'bus_id' => array_key_exists('bus_id', $request->all()) ? $request->bus_id : $service->bus_id,
            'driver_id' => array_key_exists('driver_id', $request->all()) ? $request->driver_id : $service->driver_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully',
            'data' => $service,
        ]);
    }

    public function uploadServiceImage(Request $request)
    {
        $request->validate([
            'image' => 'required|file|mimes:jpeg,jpg,png,gif,webp|max:10240',
        ]);

        $path = $request->file('image')->store('services', 'public');

        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => Storage::url($path),
        ]);
    }

    /**
     * Delete a service.
     */
    public function deleteService($id)
    {
        $service = Service::findOrFail($id);

        $hasDependencies = \App\Models\JoinerDeparture::where('service_id', $service->id)->exists()
            || \App\Models\InvoiceItem::where('service_id', $service->id)->exists()
            || \App\Models\SalesOrderItem::where('service_id', $service->id)->exists()
            || \App\Models\EducationalTourProgram::where('service_id', $service->id)->exists()
            || \App\Models\CharterRatePlan::where('service_id', $service->id)->exists();

        if ($hasDependencies) {
            $service->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Service is referenced by existing transactions or departures and cannot be deleted. It has been deactivated instead.',
                'deactivated' => true,
            ]);
        }

        // Delete associated images
        if ($service->images) {
            foreach ($service->images as $path) {
                Storage::disk('public')->delete($path);
            }
        }

        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully',
        ]);
    }

    /**
     * Store a newly created invoice in storage.
     */
    public function store(StoreInvoiceRequest $request)
    {
        $validated = $request->validated();

        $finalizer = app(InvoiceFinalizationService::class);

        try {
            DB::beginTransaction();

            try {
                $calc = $finalizer->calculateItems($request->items, $request->travel_date, $request->pax_count);
            } catch (MaxPaxExceededException $e) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => [
                        'max_pax' => ["Exceeds maximum passenger capacity. {$e->remainingSlots} slots remaining out of {$e->maxPax}."],
                    ],
                ], 422);
            }

            $processedItems = $calc['processedItems'];
            $subtotal = $calc['subtotal'];
            $taxAmount = $calc['taxAmount'];
            $totalAmount = $calc['totalAmount'];

            $paymentType = $request->payment_type ?? 'full';
            $isCash = $request->payment_method === 'Cash';
            $amountReceived = $isCash ? (float) $request->amount_received : 0.0;

            $finalizer->assertPaymentAmounts(
                $request->payment_method,
                $paymentType,
                $totalAmount,
                $amountReceived
            );

            $customerId = $finalizer->resolveCustomerId(
                $request->customer_id,
                $request->customer_name,
                $request->customer_email,
                $request->customer_contact,
                $request->customer_address
            );
            $customer = $customerId ? Customer::find($customerId) : null;
            $customerName = $request->customer_name ?: ($customer ? trim(implode(' ', array_filter([$customer->first_name, $customer->middle_name, $customer->last_name, $customer->suffix]))) : null);

            $finalizer->assertPassportCasesCanBeBilled(
                collect($validated['items'])->pluck('passport_case_id')->all(),
                $customerId,
                null,
                data_get($validated, 'custom_transaction_detail.passport_case_id')
            );

            // Create Invoice (status/balance set below by finalizeWithinTransaction)
            $invoice = Invoice::create([
                'invoice_number' => 'INV-'.strtoupper(Str::random(8)),
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_address' => $request->customer_address ?: $customer?->address,
                'customer_email' => $request->customer_email ?: $customer?->email,
                'customer_contact' => $request->customer_contact ?: $customer?->phone,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'amount_received' => $amountReceived,
                'change' => $isCash ? max(0, $amountReceived - $totalAmount) : 0.0,
                'payment_method' => $request->payment_method,
                'payment_type' => $paymentType,
                'balance' => $isCash ? max(0, $totalAmount - $amountReceived) : $totalAmount,
                'due_date' => $request->due_date ?? $request->travel_date,
                'status' => 'pending_payment',
                'created_by' => auth()->id() ?? 1,
                'notes' => $request->notes,
            ]);

            $salesOrders = app(SalesOrderService::class);
            $dedicatedGroupLine = collect($processedItems)->first(
                fn (array $item) => in_array($item['service_type'] ?? null, ['bus_rental', 'educational_tour'], true)
                    && ! empty($item['item_metadata'])
            );
            $legacyBookingAttributes = [
                'invoice_id' => $invoice->id,
                'bus_id' => $request->bus_id,
                'driver_id' => $request->driver_id,
                'seat_map' => $request->seat_map,
                'travel_date' => $request->travel_date,
                'arrival_datetime' => $request->arrival_datetime,
                'departure_datetime' => $request->departure_datetime,
                'pickup_location' => $request->pickup_location,
                'tour_code' => $request->tour_code,
                'pax_count' => $request->pax_count,
            ];

            // Typed service engines own their schedules, travelers and allocations.
            // Retain Booking only for genuine legacy lines with top-level booking data.
            if (! $dedicatedGroupLine && $salesOrders->shouldCreateLegacyBooking($processedItems, $legacyBookingAttributes)) {
                Booking::create($legacyBookingAttributes);
            }

            // Create Invoice Items
            foreach ($processedItems as $pItem) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $pItem['service_id'],
                    'passport_case_id' => $pItem['passport_case_id'],
                    'item_name' => $pItem['item_name'],
                    'service_type' => $pItem['service_type'],
                    'item_description' => $pItem['item_description'],
                    'item_metadata' => $pItem['item_metadata'],
                    'quantity' => $pItem['quantity'],
                    'unit_price' => $pItem['unit_price'],
                    'total_price' => $pItem['total_price'],
                    'adults' => $pItem['adults'],
                    'children' => $pItem['children'],
                    'adult_price' => $pItem['adult_price'],
                    'child_price' => $pItem['child_price'],
                ]);
            }

            if ($dedicatedGroupLine) {
                app(GroupBookingCaptureService::class)->capture(
                    $invoice,
                    $dedicatedGroupLine,
                    $validated,
                    auth()->id() ?? 1
                );
            }

            if (! empty($validated['custom_transaction_detail'])) {
                CustomTransactionDetail::create([
                    'invoice_id' => $invoice->id,
                    ...$validated['custom_transaction_detail'],
                ]);
            }

            foreach ($validated['itinerary'] ?? [] as $day) {
                Itinerary::create(['invoice_id' => $invoice->id, ...$day]);
            }

            foreach ($validated['passengers'] ?? [] as $passenger) {
                InvoicePassenger::create(['invoice_id' => $invoice->id, ...$passenger]);
            }

            // Status/balance recompute, PayMongo session, auto-JobOrder — must run inside this transaction.
            $invoice = $finalizer->finalizeWithinTransaction($invoice, $processedItems);

            // Typed fulfillment and fleet allocation are part of the same commit as the
            // invoice and accounting entries. Availability failures therefore leave no
            // partially posted invoice behind.
            if ($salesOrders->hasTypedCapturePayload($processedItems)) {
                $salesOrders->captureInvoice($invoice, $request->user()?->id ?? $invoice->created_by);
            }

            DB::commit();

            // Collection sync, receipt email, in-app alert — must run after commit.
            $finalizer->afterCommit($invoice, ['actor' => $request->user(), 'source' => 'pos']);

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => (new InvoiceResource($invoice->load(Invoice::operationalDocumentRelations())))->resolve(),
            ], 201);

        } catch (ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'The invoice details could not be validated.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();

            $errorReference = (string) Str::uuid();
            \Log::error('Invoice checkout failed.', [
                'error_reference' => $errorReference,
                'exception' => $e,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Checkout could not be completed. No payment was recorded. Please contact support with reference '.$errorReference.'.',
                'error_reference' => $errorReference,
            ], 500);
        }
    }

    /**
     * Display the specified invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(Invoice::operationalDocumentRelations())->find($id);

        if (! $invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => (new InvoiceResource($invoice))->resolve(),
        ]);
    }

    /**
     * Update invoice status (e.g., mark as paid).
     */
    public function updateStatus(UpdateInvoiceStatusRequest $request, $id)
    {
        // C-04: only accept known invoice statuses — never persist an arbitrary string.
        $validated = $request->validated();
        $invoice = DB::transaction(function () use ($id, $validated) {
            $invoice = Invoice::lockForUpdate()->findOrFail($id);
            $collection = $invoice->collection()->lockForUpdate()->first();
            $postedPayments = $collection
                ? $collection->payments()->lockForUpdate()->get()
                : collect();
            $postedAmount = round((float) $postedPayments->sum('amount'), 2);
            $postedCents = (int) round($postedAmount * 100);
            $totalCents = (int) round((float) $invoice->total_amount * 100);
            $requestedStatus = $validated['status'];

            if (in_array($invoice->status, ['cancelled', 'voided', 'disbursed_budget'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['A cancelled, voided, or internal disbursement invoice cannot be reconciled into a payable status.'],
                ]);
            }

            if (in_array($requestedStatus, ['pending_payment', 'partial', 'paid'], true)) {
                $evidenceStatus = match (true) {
                    $postedCents <= 0 => 'pending_payment',
                    $postedCents < $totalCents => 'partial',
                    default => 'paid',
                };

                if ($requestedStatus !== $evidenceStatus) {
                    throw ValidationException::withMessages([
                        'status' => [
                            "Invoice status cannot be changed to {$requestedStatus} without matching posted payment evidence. Record the payment in Collections instead.",
                        ],
                    ]);
                }

                $invoice->update([
                    'status' => $evidenceStatus,
                    'amount_received' => $postedAmount,
                    'balance' => max(0, round((float) $invoice->total_amount - $postedAmount, 2)),
                    'change' => max(0, round($postedAmount - (float) $invoice->total_amount, 2)),
                ]);

                return $invoice->fresh();
            }

            throw ValidationException::withMessages([
                'status' => ['Invoice status can only be reconciled from posted payment evidence.'],
            ]);
        });

        $notificationEmail = $invoice->notificationEmail();
        if ($notificationEmail) {
            try {
                SendInvoiceDocumentsJob::dispatch($invoice->id)->afterResponse();
            } catch (\Exception $mailEx) {
                \Log::error("Failed to send POS status update email to {$notificationEmail}: ".$mailEx->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice status updated successfully',
            'data' => $invoice,
        ]);
    }

    /**
     * Handle PayMongo Webhooks for incoming payments.
     */
    public function handleWebhook(Request $request)
    {
        $signatureHeader = $request->header('paymongo-signature');
        $secret = config('services.paymongo.webhook_secret') ?: env('PAYMONGO_WEBHOOK_SECRET');

        // C-10: never process a payment webhook when the secret is unconfigured or the
        // signature is missing — otherwise anyone can forge "paid" events.
        if (! $secret) {
            \Log::error('PayMongo webhook secret is not configured; rejecting webhook.');

            return response()->json(['error' => 'Webhook processing is not configured.'], 503);
        }

        if (! $signatureHeader) {
            return response()->json(['error' => 'Missing webhook signature'], 401);
        }

        if ($secret && $signatureHeader) {
            $parsedSignature = [];
            foreach (explode(',', $signatureHeader) as $part) {
                $p = explode('=', $part, 2);
                if (count($p) === 2) {
                    $parsedSignature[$p[0]] = $p[1];
                }
            }

            if (! isset($parsedSignature['t'])) {
                return response()->json(['error' => 'Invalid signature format'], 401);
            }

            $timestamp = $parsedSignature['t'];

            if (abs(time() - (int) $timestamp) > 300) {
                \Log::warning('PayMongo webhook signature expired', ['age_seconds' => abs(time() - (int) $timestamp)]);

                return response()->json(['error' => 'Webhook signature expired'], 401);
            }
            $signedPayload = $timestamp.'.'.$request->getContent();
            $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

            $isValid = false;
            if (isset($parsedSignature['te']) && hash_equals($expectedSignature, $parsedSignature['te'])) {
                $isValid = true;
            }
            if (isset($parsedSignature['li']) && hash_equals($expectedSignature, $parsedSignature['li'])) {
                $isValid = true;
            }

            if (! $isValid) {
                return response()->json(['error' => 'Invalid webhook signature'], 401);
            }
        }

        $payload = $request->all();
        $providerEventId = $payload['data']['id'] ?? 'payload_'.hash('sha256', $request->getContent());
        $eventReceipt = IntegrationEvent::firstOrCreate(
            ['provider' => 'paymongo', 'external_id' => $providerEventId],
            ['event_type' => $payload['data']['attributes']['type'] ?? 'unknown', 'payload_hash' => hash('sha256', $request->getContent()), 'status' => 'received', 'received_at' => now()]
        );
        if (! $eventReceipt->wasRecentlyCreated && $eventReceipt->status === 'processed') {
            return response()->json(['status' => 'already_processed']);
        }

        if (isset($payload['data']['attributes']['type'])) {
            $eventType = $payload['data']['attributes']['type'];

            if ($eventType === 'checkout_session.payment.paid') {
                $providerResource = $payload['data']['attributes']['data'] ?? [];
                $sessionData = $providerResource['attributes'] ?? [];
                $resourceId = $providerResource['id'] ?? null;
                $resourceType = $providerResource['type'] ?? null;
                $providerPaymentId = ($resourceType === 'payment' || str_starts_with((string) $resourceId, 'pay_'))
                    ? $resourceId
                    : ($sessionData['payments'][0]['id'] ?? $sessionData['payment_id'] ?? null);

                // Usually PayMongo sends the checkout session ID in the event
                // E.g. $sessionData['checkout_session_id']
                // Let's find the invoice by payment_id which we stored as the session ID
                $sessionId = $sessionData['checkout_session_id'] ?? null;

                if (! $sessionId) {
                    // Fallback to checking the payment object id if stored differently
                    $paymentId = $payload['data']['attributes']['data']['id'] ?? null;
                    $invoice = Invoice::where('payment_id', $paymentId)->first();
                } else {
                    $invoice = Invoice::where('payment_id', $sessionId)->first();
                }

                if ($invoice) {
                    $amountPaidCentavos = $sessionData['amount'] ?? 0;
                    $amountPaidPHP = $amountPaidCentavos / 100;
                    $currency = strtoupper((string) ($sessionData['currency'] ?? 'PHP'));
                    $eventId = $providerEventId;

                    if (! $providerPaymentId || $currency !== 'PHP' || $amountPaidPHP <= 0) {
                        $eventReceipt->update([
                            'status' => 'failed',
                            'error' => 'PayMongo payment payload was incomplete or used an unsupported currency.',
                            'invoice_id' => $invoice->id,
                            'processed_at' => now(),
                        ]);

                        return response()->json(['error' => 'Invalid payment payload.'], 422);
                    }

                    // PayMongo retries webhooks. The provider event id is the accounting
                    // idempotency key. Lock and recompute accounting truth in the
                    // canonical Invoice -> Collection -> payments order so a
                    // simultaneous counter payment cannot overpost the invoice.
                    $paymentResult = DB::transaction(function () use ($invoice, $amountPaidPHP, $eventId, $providerPaymentId) {
                        $lockedInvoice = Invoice::lockForUpdate()->findOrFail($invoice->id);
                        $key = $eventId ? "paymongo:{$eventId}" : "paymongo-session:{$lockedInvoice->payment_id}";

                        if (in_array($lockedInvoice->status, ['cancelled', 'voided', 'disbursed_budget'], true)) {
                            return [
                                'error' => 'PayMongo payment cannot be posted to a terminal invoice.',
                                'invoice' => $lockedInvoice,
                            ];
                        }

                        // Keep the canonical Invoice -> Collection lock order even
                        // while synchronizing legacy collection data. Existing
                        // collections must be locked before syncCollection mutates
                        // or recalculates them. When none exists, the invoice lock
                        // serializes creation, after which we lock the new row.
                        $collection = Collection::where('invoice_id', $lockedInvoice->id)->lockForUpdate()->first();
                        if ($collection) {
                            $lockedInvoice->setRelation('collection', $collection);
                            app(BillingCollectionService::class)->syncCollection($lockedInvoice);
                        } else {
                            $lockedInvoice->unsetRelation('collection');
                            app(BillingCollectionService::class)->syncCollection($lockedInvoice);
                            $collection = Collection::where('invoice_id', $lockedInvoice->id)->lockForUpdate()->first();
                        }

                        if (! $collection) {
                            throw new \RuntimeException('Unable to create collection for PayMongo payment.');
                        }

                        $paymentEvidence = $collection->payments()->lockForUpdate()->get();
                        $existing = $paymentEvidence->first(
                            fn (CollectionPayment $payment) => $payment->idempotency_key === $key
                                || $payment->paymongo_payment_id === $providerPaymentId
                        );

                        if ($existing) {
                            return ['invoice' => $lockedInvoice->fresh(), 'duplicate' => true];
                        }

                        $postedCents = (int) round((float) $paymentEvidence->sum('amount') * 100);
                        $totalCents = (int) round((float) $lockedInvoice->total_amount * 100);
                        $remainingCents = max(0, $totalCents - $postedCents);
                        $paymentCents = (int) round($amountPaidPHP * 100);

                        if ($paymentCents > $remainingCents) {
                            return [
                                'error' => 'PayMongo payment exceeds the invoice outstanding balance.',
                                'invoice' => $lockedInvoice,
                            ];
                        }

                        $collection->payments()->create([
                            'payment_date' => now()->toDateString(),
                            'payment_method' => $lockedInvoice->payment_method,
                            'amount' => $amountPaidPHP,
                            'balance' => ($remainingCents - $paymentCents) / 100,
                            'idempotency_key' => $key,
                            'paymongo_payment_id' => $providerPaymentId,
                        ]);
                        $collection->recalculate();

                        return ['invoice' => $lockedInvoice->fresh(), 'duplicate' => false];
                    });

                    if (isset($paymentResult['error'])) {
                        $eventReceipt->update([
                            'status' => 'failed',
                            'error' => $paymentResult['error'],
                            'invoice_id' => $invoice->id,
                            'processed_at' => now(),
                        ]);

                        return response()->json(['error' => 'Payment amount does not match the invoice balance.'], 409);
                    }

                    $invoice = $paymentResult['invoice'];
                    $duplicate = $paymentResult['duplicate'] ?? false;

                    if (! $duplicate) {
                        $freshInvoice = $invoice->fresh();
                        app(SalesOrderService::class)->captureInvoice($freshInvoice, $freshInvoice->created_by);
                        app(SalesOrderService::class)->syncInvoiceFinancials($freshInvoice);
                    }

                    $eventReceipt->update(['status' => 'processed', 'invoice_id' => $invoice->id, 'processed_at' => now()]);

                    $notificationEmail = $invoice->notificationEmail();
                    if (! $duplicate && $notificationEmail) {
                        try {
                            SendInvoiceDocumentsJob::dispatch($invoice->id)->afterResponse();
                        } catch (\Exception $mailEx) {
                            \Log::error("Failed to send updated payment receipt email via webhook to {$notificationEmail}: ".$mailEx->getMessage());
                        }
                    }

                    // Send SystemAlert to admins/creator
                    if (! $duplicate && $invoice->creator) {
                        $invoice->creator->notify(new SystemAlert(
                            'Payment Received',
                            "Invoice #{$invoice->invoice_number} received a payment of {$amountPaidPHP} PHP. New balance: {$invoice->balance} PHP.",
                            'success',
                            "/accounting/transactions/{$invoice->id}"
                        ));
                    }
                } else {
                    $eventReceipt->update(['status' => 'failed', 'error' => 'No invoice matched the PayMongo checkout session.', 'processed_at' => now()]);
                }
            }

            if (in_array($eventType, ['payment.refunded', 'payment.refund.updated'], true)) {
                $resource = $payload['data']['attributes']['data'] ?? [];
                $resourceAttributes = $resource['attributes'] ?? [];
                $refundResource = $resource;

                if (($resource['type'] ?? null) === 'payment' || str_starts_with((string) ($resource['id'] ?? ''), 'pay_')) {
                    $refunds = $resourceAttributes['refunds'] ?? [];
                    $refundResource = ! empty($refunds) ? end($refunds) : [];
                }

                $refundAttributes = $refundResource['attributes'] ?? $refundResource;
                $providerRefundId = $refundResource['id'] ?? $refundAttributes['id'] ?? null;
                $paymentId = $refundAttributes['payment_id']
                    ?? ((($resource['type'] ?? null) === 'payment') ? ($resource['id'] ?? null) : null);
                $providerStatus = $eventType === 'payment.refunded'
                    ? 'succeeded'
                    : (string) ($refundAttributes['status'] ?? 'pending');
                $amount = isset($refundAttributes['amount']) ? ((float) $refundAttributes['amount'] / 100) : null;
                $providerError = $refundAttributes['failure_reason']
                    ?? $refundAttributes['error']
                    ?? null;

                $refund = app(SalesLifecycleService::class)->reconcilePayMongoRefund(
                    $providerRefundId,
                    $paymentId,
                    $providerStatus,
                    $amount,
                    is_string($providerError) ? $providerError : null
                );

                if ($refund) {
                    $eventReceipt->update([
                        'status' => 'processed',
                        'invoice_id' => $refund->invoice_id,
                        'metadata' => ['sales_refund_id' => $refund->id, 'provider_status' => $providerStatus],
                        'processed_at' => now(),
                        'error' => null,
                    ]);
                } else {
                    $eventReceipt->update([
                        'status' => 'failed',
                        'error' => 'No matching in-system refund was found for this PayMongo event.',
                        'processed_at' => now(),
                    ]);
                }
            }
        }

        if ($eventReceipt->status === 'received') {
            $eventReceipt->update(['status' => 'ignored', 'processed_at' => now()]);
        }

        return response()->json(['status' => 'received']);
    }
}
