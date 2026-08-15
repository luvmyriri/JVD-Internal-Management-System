<?php

namespace App\Services;

use App\Exceptions\MaxPaxExceededException;
use App\Mail\BookingConfirmationMail;
use App\Mail\TransactionNotificationMail;
use App\Models\Account;
use App\Models\CharterRatePlan;
use App\Models\Contract;
use App\Models\Customer;
use App\Models\CustomTransactionDetail;
use App\Models\EducationalTourProgram;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\PassportCase;
use App\Models\Service;
use App\Models\SystemSetting;
use App\Models\TripTicket;
use App\Models\User;
use App\Notifications\SystemAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Extracted from BillingController::store so the same item-calculation, customer-resolution,
 * and invoice-finalization logic can be reused by the contract-gated checkout flow
 * (ContractController::draft + CustomerPortalController::signContract) without duplicating it.
 *
 * Split into two phases to preserve BillingController::store's exact original ordering:
 *   - finalizeWithinTransaction(): status/balance, PayMongo session, auto-JobOrder — must run
 *     BEFORE the caller's DB::commit() (these were inside the transaction in the original code).
 *   - afterCommit(): Collection sync, receipt email, optional booking-confirmation email,
 *     in-app alert — must run AFTER the caller's DB::commit() (unchanged from original ordering,
 *     so a slow mail/notification call never holds the DB transaction open).
 */
class InvoiceFinalizationService
{
    /**
     * Validates max_pax capacity and computes subtotal/tax/total for a set of cart items.
     * Throws MaxPaxExceededException (caller decides the HTTP response shape) instead of
     * returning an inline error response, so this is reusable across controllers.
     *
     * @return array{processedItems: array, subtotal: float, taxAmount: float, totalAmount: float}
     */
    public function calculateItems(array $items, ?string $travelDate, ?int $requestPaxCount, ?float $untrustedTaxRate = null): array
    {
        $subtotal = 0.0;
        // Tax is configuration-owned. Keep the fourth argument for backwards-compatible
        // callers, but never let checkout payloads choose the rate applied to an invoice.
        $taxRate = (float) SystemSetting::getValue('vat_rate', 0.12);
        $processedItems = [];

        foreach ($items as $index => $item) {
            $metadata = is_array($item['item_metadata'] ?? null) ? $item['item_metadata'] : [];
            $ratePlanId = $metadata['rate_plan_id'] ?? null;
            $programId = $metadata['program_id'] ?? null;

            if ($ratePlanId && $programId) {
                throw ValidationException::withMessages([
                    'items' => ['An invoice line cannot reference both a charter rate plan and an educational program.'],
                ]);
            }

            $service = null;
            $serviceType = null;
            $adults = isset($item['adults']) ? (int) $item['adults'] : null;
            $children = isset($item['children']) ? (int) $item['children'] : null;
            $adultUnit = null;
            $childUnit = null;

            if ($ratePlanId) {
                $plan = CharterRatePlan::where('is_active', true)->lockForUpdate()->find($ratePlanId);
                if (! $plan) {
                    throw ValidationException::withMessages([
                        'items' => ['The selected charter rate plan is no longer available.'],
                    ]);
                }

                $service = Service::lockForUpdate()->find($plan->service_id);
                if (! $service) {
                    throw ValidationException::withMessages([
                        'items' => ['The charter rate plan is not linked to a valid catalog service.'],
                    ]);
                }
                if (! empty($item['service_id']) && (int) $item['service_id'] !== (int) $service->id) {
                    throw ValidationException::withMessages([
                        'items' => ['The selected catalog service does not match the charter rate plan.'],
                    ]);
                }

                foreach (['starts_at', 'ends_at', 'estimated_kilometers'] as $requiredField) {
                    if (! isset($metadata[$requiredField]) || $metadata[$requiredField] === '') {
                        throw ValidationException::withMessages([
                            "items.0.item_metadata.{$requiredField}" => ["Charter pricing requires {$requiredField}."],
                        ]);
                    }
                }

                $assignments = is_array($metadata['bus_assignments'] ?? null) ? $metadata['bus_assignments'] : [];
                $effectiveQty = count($assignments) > 0
                    ? count($assignments)
                    : max(1, (int) ($metadata['requested_units'] ?? $metadata['buses_required'] ?? $item['quantity'] ?? 1));
                $pricing = app(CharterBookingService::class)->calculate(
                    $plan,
                    (string) $metadata['starts_at'],
                    (string) $metadata['ends_at'],
                    (float) $metadata['estimated_kilometers']
                );
                $unitPrice = round((float) $pricing['subtotal'], 2);
                $itemTotal = round($unitPrice * $effectiveQty, 2);
                $serviceType = 'bus_rental';
                $adults = null;
                $children = null;
                $metadata['requested_units'] = $effectiveQty;
                $metadata['buses_required'] = $effectiveQty;
                $metadata['pricing_snapshot'] = $pricing;
            } elseif ($programId) {
                $program = EducationalTourProgram::where('is_active', true)->lockForUpdate()->find($programId);
                if (! $program) {
                    throw ValidationException::withMessages([
                        'items' => ['The selected educational program is no longer available.'],
                    ]);
                }

                $service = $program->service_id
                    ? Service::lockForUpdate()->find($program->service_id)
                    : null;
                if (! empty($item['service_id']) && (int) $item['service_id'] !== (int) ($service?->id ?? 0)) {
                    throw ValidationException::withMessages([
                        'items' => ['The selected catalog service does not match the educational program.'],
                    ]);
                }
                if (! isset($metadata['student_count'])) {
                    throw ValidationException::withMessages([
                        'items.0.item_metadata.student_count' => ['Educational program pricing requires a student count.'],
                    ]);
                }

                $pricing = app(EducationalTourBookingService::class)->calculate(
                    $program,
                    (int) $metadata['student_count'],
                    (int) ($metadata['tour_guide_count'] ?? $metadata['chaperone_count'] ?? 0)
                );
                $effectiveQty = 1;
                $unitPrice = round((float) $pricing['subtotal'], 2);
                $itemTotal = $unitPrice;
                $serviceType = 'educational_tour';
                $adults = null;
                $children = null;
                $metadata['student_count'] = $pricing['student_count'];
                $metadata['tour_guide_count'] = $pricing['tour_guide_count'];
                $metadata['chaperone_count'] = $pricing['chaperone_count'];
                $metadata['pricing_snapshot'] = $pricing;
            } else {
                $service = ! empty($item['service_id']) ? Service::lockForUpdate()->find($item['service_id']) : null;
                if (! empty($item['service_id']) && ! $service) {
                    throw ValidationException::withMessages(['items' => ['The selected catalog service no longer exists.']]);
                }
                if (! $service && empty($item['item_name'])) {
                    throw ValidationException::withMessages(['items' => ['A bespoke line must include its item name.']]);
                }

                // Catalog lines always use the locked catalog snapshot. Only a true
                // bespoke line may carry an explicit staff-entered price; that path is
                // role-gated and request-audited by the API middleware.
                if ($service) {
                    if (! empty($item['service_type'])
                        && ! empty($service->service_type)
                        && $item['service_type'] !== $service->service_type) {
                        throw ValidationException::withMessages([
                            "items.{$index}.item_metadata.originating_catalog_service_id" => [
                                'The selected catalog product does not support the submitted service engine.',
                            ],
                        ]);
                    }
                    $baseUnitPrice = round((float) $service->price, 2);
                    $adultUnit = round((float) ($service->adult_price ?? $service->price), 2);
                    $childUnit = round((float) ($service->child_price ?? $service->price), 2);
                    // The catalog owns both its price and fulfillment engine. A caller
                    // cannot relabel a package to bypass engine-specific validation.
                    $serviceType = $service->service_type ?: ($item['service_type'] ?? null);
                } else {
                    if (! array_key_exists('unit_price', $item) || $item['unit_price'] === null) {
                        throw ValidationException::withMessages([
                            'items' => ['A bespoke invoice line requires an explicit unit price.'],
                        ]);
                    }
                    $baseUnitPrice = round((float) $item['unit_price'], 2);
                    $adultUnit = round((float) ($item['adult_price'] ?? $baseUnitPrice), 2);
                    $childUnit = round((float) ($item['child_price'] ?? $baseUnitPrice), 2);
                    $serviceType = $item['service_type'] ?? 'custom_arrangement';
                }

                if ($adults !== null || $children !== null) {
                    $adultCount = (int) ($adults ?? 0);
                    $childCount = (int) ($children ?? 0);
                    $itemTotal = round(($adultCount * $adultUnit) + ($childCount * $childUnit), 2);
                    $effectiveQty = $adultCount + $childCount;
                    $unitPrice = $effectiveQty > 0
                        ? round($itemTotal / $effectiveQty, 2)
                        : $baseUnitPrice;
                } else {
                    $effectiveQty = (int) $item['quantity'];
                    $unitPrice = $baseUnitPrice;
                    $itemTotal = round($unitPrice * $effectiveQty, 2);
                }
            }

            if ($service?->max_pax && $travelDate) {
                $paxToAdd = 0;
                if ($adults !== null || $children !== null) {
                    $paxToAdd = ($adults ?? 0) + ($children ?? 0);
                } else {
                    $paxToAdd = $effectiveQty;
                }

                if ($requestPaxCount && $requestPaxCount > $paxToAdd) {
                    $paxToAdd = $requestPaxCount;
                }

                $alreadyBooked = DB::table('invoice_items')
                    ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                    ->leftJoin('bookings', 'invoices.id', '=', 'bookings.invoice_id')
                    ->where('invoice_items.service_id', $service->id)
                    ->where('bookings.travel_date', $travelDate)
                    ->where('invoices.status', '!=', 'cancelled')
                    ->sum(DB::raw('CASE WHEN invoice_items.adults IS NOT NULL OR invoice_items.children IS NOT NULL THEN COALESCE(invoice_items.adults, 0) + COALESCE(invoice_items.children, 0) ELSE invoice_items.quantity END'));

                $remaining = $service->max_pax - (int) $alreadyBooked;

                if ($paxToAdd > $remaining) {
                    throw new MaxPaxExceededException($service->name, $paxToAdd, $remaining, $service->max_pax, $travelDate);
                }
            }

            $subtotal = round($subtotal + $itemTotal, 2);

            $processedItems[] = [
                'service_id' => $service?->id,
                'passport_case_id' => $item['passport_case_id'] ?? null,
                'item_name' => $item['item_name'] ?? $service?->name,
                'service_type' => $serviceType ?? 'custom_arrangement',
                'item_description' => $item['item_description'] ?? $item['description'] ?? $service?->description,
                'item_metadata' => $metadata ?: null,
                'quantity' => $effectiveQty ?? $item['quantity'],
                'unit_price' => $unitPrice,
                'total_price' => $itemTotal,
                'adults' => $adults,
                'children' => $children,
                'adult_price' => $adults !== null || $children !== null ? $adultUnit : null,
                'child_price' => $adults !== null || $children !== null ? $childUnit : null,
                'service_date' => $item['service_date'] ?? null,
                'destination' => $item['destination'] ?? null,
            ];
        }

        $taxAmount = round($subtotal * $taxRate, 2);
        $totalAmount = round($subtotal + $taxAmount, 2);

        return [
            'processedItems' => $processedItems,
            'subtotal' => $subtotal,
            'taxAmount' => $taxAmount,
            'totalAmount' => $totalAmount,
        ];
    }

    /**
     * Re-derives the {status, balance} pair from payment method/type/amounts — single-sourced
     * so both the immediate (BillingController::store) and gated (contract sign) paths agree.
     */
    public function assertPaymentAmounts(
        string $paymentMethod,
        string $paymentType,
        float $totalAmount,
        float $amountReceived
    ): void {
        if ($amountReceived < 0) {
            throw ValidationException::withMessages([
                'amount_received' => ['The amount received cannot be negative.'],
            ]);
        }

        if ($paymentMethod !== 'Cash') {
            return;
        }

        if ($paymentType === 'downpayment') {
            if ($amountReceived <= 0) {
                throw ValidationException::withMessages([
                    'amount_received' => ['A cash downpayment must be greater than zero.'],
                ]);
            }

            if ($amountReceived >= $totalAmount) {
                throw ValidationException::withMessages([
                    'amount_received' => ['A downpayment must be less than the invoice total. Select full payment when the invoice is fully covered.'],
                ]);
            }

            return;
        }

        if ($amountReceived < $totalAmount) {
            throw ValidationException::withMessages([
                'amount_received' => ['Full cash payment must cover the invoice total.'],
            ]);
        }
    }

    public function computePaymentStatus(string $paymentMethod, string $paymentType, float $totalAmount, float $amountReceived): array
    {
        $this->assertPaymentAmounts($paymentMethod, $paymentType, $totalAmount, $amountReceived);

        if ($paymentMethod === 'Cash') {
            if ($paymentType === 'downpayment') {
                return ['status' => 'partial', 'balance' => max(0, $totalAmount - $amountReceived)];
            }

            return ['status' => 'paid', 'balance' => 0];
        }

        // GCash/Card (digital gateway): pending until callback/webhook confirmation
        return [
            'status' => 'pending_payment',
            'balance' => $totalAmount,
            'amount_received' => 0.0,
            'change' => 0.0,
        ];
    }

    /**
     * Build provider rows in integer centavos. Sold lines use their extended price,
     * and VAT is explicit, so weighted passenger pricing cannot introduce drift.
     *
     * @return array<int, array{amount:int,currency:string,name:string,quantity:int}>
     */
    private function buildPayMongoLineItems(Invoice $invoice, array $processedItems): array
    {
        $lineItems = [];
        $lastServiceIndex = null;

        foreach ($processedItems as $item) {
            $amount = (int) round((float) ($item['total_price'] ?? 0) * 100);
            if ($amount <= 0) {
                continue;
            }

            $service = ! empty($item['service_id']) ? Service::find($item['service_id']) : null;
            $displayName = $item['item_name'] ?? $service?->name ?? 'Travel service';
            $quantity = (int) ($item['quantity'] ?? 1);

            if (isset($item['adults']) || isset($item['children'])) {
                $displayName .= sprintf(
                    ' (%d Adults, %d Children)',
                    (int) ($item['adults'] ?? 0),
                    (int) ($item['children'] ?? 0)
                );
            } elseif ($quantity !== 1) {
                $displayName .= " (Qty: {$quantity})";
            }

            $lineItems[] = [
                'amount' => $amount,
                'currency' => 'PHP',
                'name' => $displayName,
                'quantity' => 1,
            ];
            $lastServiceIndex = array_key_last($lineItems);
        }

        $vatIndex = null;
        $vatAmount = (int) round((float) $invoice->tax_amount * 100);
        if ($vatAmount > 0) {
            $vatIndex = count($lineItems);
            $lineItems[] = [
                'amount' => $vatAmount,
                'currency' => 'PHP',
                'name' => 'Value-added tax (VAT)',
                'quantity' => 1,
            ];
        }

        $targetAmount = (int) round((float) $invoice->total_amount * 100);
        $sentAmount = array_sum(array_map(
            fn (array $line): int => $line['amount'] * $line['quantity'],
            $lineItems
        ));
        $roundingAdjustment = $targetAmount - $sentAmount;

        if ($roundingAdjustment !== 0 && $lineItems !== []) {
            // Keep the tax row equal to the invoice's persisted tax amount. Any
            // centavo drift belongs to the net service allocation, not VAT.
            $adjustmentIndex = $lastServiceIndex ?? $vatIndex ?? array_key_last($lineItems);
            $lineItems[$adjustmentIndex]['amount'] += $roundingAdjustment;
        }

        return $lineItems;
    }

    /**
     * Resolves an existing customer by id/email/phone, or auto-registers a new one from a
     * free-text name. Extracted verbatim from BillingController::store's customer block.
     */
    public function resolveCustomerId(?int $customerId, ?string $name, ?string $email, ?string $contact, ?string $address): ?int
    {
        $existingCustomer = null;

        if ($customerId) {
            $existingCustomer = Customer::find($customerId);
        }

        if (! $existingCustomer && $email) {
            $existingCustomer = Customer::where('email', $email)->first();
        }
        if (! $existingCustomer && $contact) {
            $existingCustomer = Customer::where('phone', $contact)->first();
        }

        if ($existingCustomer) {
            $updatedData = [];
            if ($address && $existingCustomer->address !== $address) {
                $updatedData['address'] = $address;
            }
            if ($email && $existingCustomer->email !== $email) {
                $updatedData['email'] = $email;
            }
            if ($contact && $existingCustomer->phone !== $contact) {
                $updatedData['phone'] = $contact;
            }
            if ($name) {
                $parts = explode(' ', trim($name));
                if (count($parts) > 1) {
                    $lastName = array_pop($parts);
                    $firstName = implode(' ', $parts);
                } else {
                    $firstName = $name;
                    $lastName = '';
                }

                if ($existingCustomer->first_name !== $firstName || $existingCustomer->last_name !== $lastName) {
                    $updatedData['first_name'] = $firstName;
                    $updatedData['last_name'] = $lastName;
                }
            }

            if (! empty($updatedData)) {
                $existingCustomer->update($updatedData);
            }

            return $existingCustomer->id;
        }

        if (! $name) {
            return null;
        }

        $parts = explode(' ', trim($name));
        if (count($parts) > 1) {
            $lastName = array_pop($parts);
            $firstName = implode(' ', $parts);
        } else {
            $firstName = $name;
            $lastName = '';
        }

        $newCustomer = Customer::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $contact,
            'address' => $address,
        ]);

        return $newCustomer->id;
    }

    /**
     * Ensure Travel Assistance cases can be billed by this invoice customer.
     *
     * Item-level links are the primary ownership record and may contain several distinct
     * cases on one invoice. The legacy detail link remains accepted for older clients.
     * Case rows are locked in a stable order so concurrent checkouts cannot bill the same
     * case. Passing the current invoice id permits revalidation when a draft is signed.
     *
     * @param  array<int, int|string|null>  $itemPassportCaseIds
     */
    public function assertPassportCasesCanBeBilled(
        array $itemPassportCaseIds,
        ?int $customerId,
        ?int $currentInvoiceId = null,
        ?int $legacyPassportCaseId = null
    ): void {
        $itemCaseIds = collect($itemPassportCaseIds)
            ->filter(fn ($id) => $id !== null && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($itemCaseIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => ['A passport or visa case can only appear once on an invoice.'],
            ]);
        }

        $caseIds = $itemCaseIds
            ->when($legacyPassportCaseId, fn ($ids) => $ids->push((int) $legacyPassportCaseId))
            ->unique()
            ->sort()
            ->values();

        if ($caseIds->isEmpty()) {
            return;
        }

        $cases = PassportCase::query()
            ->whereIn('id', $caseIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($caseIds as $caseId) {
            $passportCase = $cases->get($caseId);
            $errorKey = $itemCaseIds->contains($caseId)
                ? 'items'
                : 'custom_transaction_detail.passport_case_id';

            if (! $passportCase) {
                throw ValidationException::withMessages([
                    $errorKey => ['The selected passport or visa case no longer exists.'],
                ]);
            }

            if (! $customerId || (int) $passportCase->customer_id !== (int) $customerId) {
                throw ValidationException::withMessages([
                    $errorKey => ['The selected passport or visa case belongs to a different customer.'],
                ]);
            }

            $itemLink = InvoiceItem::query()
                ->where('passport_case_id', $caseId)
                ->when($currentInvoiceId, fn ($query) => $query->where('invoice_id', '!=', $currentInvoiceId))
                ->first();

            $legacyLink = CustomTransactionDetail::query()
                ->where('passport_case_id', $caseId)
                ->when($currentInvoiceId, fn ($query) => $query->where('invoice_id', '!=', $currentInvoiceId))
                ->first();

            if ($itemLink || $legacyLink) {
                throw ValidationException::withMessages([
                    $errorKey => ['The selected passport or visa case is already billed on another transaction.'],
                ]);
            }
        }
    }

    /**
     * Recomputes status/balance, creates the PayMongo session (GCash/Card), and auto-generates
     * a Job Order for bus-related services. Must run inside the caller's existing DB transaction
     * (matches BillingController::store's original placement of this logic before DB::commit()).
     */
    public function finalizeWithinTransaction(Invoice $invoice, array $processedItems): Invoice
    {
        $invoice->load('booking');
        $booking = $invoice->booking;
        $isSeatMapBooking = false;

        // Conflict Check: Prevent double-booking driver or bus on overlapping date range
        if ($booking && $booking->travel_date) {
            $dateStr = is_string($booking->travel_date) ? explode('T', $booking->travel_date)[0] : $booking->travel_date->toDateString();

            if ($booking->bus_id) {
                // Check travels (only if not a seat-based/joiner booking where multiple customers share the bus)
                $isSeatMapBooking = is_array($booking->seat_map) && count($booking->seat_map) > 0;

                $travelConflict = null;
                $ttConflict = null;

                if (! $isSeatMapBooking) {
                    $travelConflict = \DB::table('travels')
                        ->where('bus_id', $booking->bus_id)
                        ->where('travel_date', $dateStr)
                        ->where('status', '!=', 'cancelled')
                        ->where(function ($q) use ($booking) {
                            $q->where('reference_type', '!=', 'booking')
                                ->orWhere('reference_id', '!=', $booking->id);
                        })
                        ->lockForUpdate()
                        ->first();

                    // Check active trip tickets (excluding cancelled ones)
                    $ttConflict = TripTicket::where('bus_id', $booking->bus_id)
                        ->where('date_of_travel', $dateStr)
                        ->where('status', '!=', 'cancelled')
                        ->where(function ($q) use ($invoice) {
                            $q->whereNull('invoice_id')
                                ->orWhere('invoice_id', '!=', $invoice->id);
                        })
                        ->lockForUpdate()
                        ->first();
                }

                if ($travelConflict || $ttConflict) {
                    throw new \InvalidArgumentException("Vehicle (Bus #{$booking->bus_id}) is already reserved/booked for travel on ".$dateStr.'.');
                }

                // Check PMS
                $pmsConflict = \DB::table('pms_schedules')
                    ->where('bus_id', $booking->bus_id)
                    ->where('maintenance_date', $dateStr)
                    ->lockForUpdate()
                    ->first();
                if ($pmsConflict) {
                    throw new \InvalidArgumentException('Vehicle is under maintenance (PMS) on '.$dateStr.'.');
                }
            }

            if ($booking->driver_id && ! $isSeatMapBooking) {
                // Check travels
                $driverTravelConflict = \DB::table('travels')
                    ->where('driver_id', $booking->driver_id)
                    ->where('travel_date', $dateStr)
                    ->where('status', '!=', 'cancelled')
                    ->where(function ($q) use ($booking) {
                        $q->where('reference_type', '!=', 'booking')
                            ->orWhere('reference_id', '!=', $booking->id);
                    })
                    ->lockForUpdate()
                    ->first();

                // Check active trip tickets for driver (excluding cancelled ones)
                $driverTtConflict = TripTicket::where('driver_id', $booking->driver_id)
                    ->where('date_of_travel', $dateStr)
                    ->where('status', '!=', 'cancelled')
                    ->where(function ($q) use ($invoice) {
                        $q->whereNull('invoice_id')
                            ->orWhere('invoice_id', '!=', $invoice->id);
                    })
                    ->lockForUpdate()
                    ->first();

                if ($driverTravelConflict || $driverTtConflict) {
                    throw new \InvalidArgumentException('Driver is already assigned/reserved for travel on '.$dateStr.'.');
                }
            }
        }

        $statusResult = $this->computePaymentStatus(
            $invoice->payment_method,
            $invoice->payment_type ?? 'full',
            (float) $invoice->total_amount,
            (float) $invoice->amount_received
        );
        $invoice->update($statusResult);

        if (in_array($invoice->payment_method, ['GCash', 'Card']) && ! $invoice->payment_id && (float) $invoice->total_amount > 0) {
            $paymongo = new PayMongoService;
            $payData = [
                'line_items' => $this->buildPayMongoLineItems($invoice, $processedItems),
                'description' => "JVD Order #{$invoice->invoice_number}",
                'reference_number' => $invoice->invoice_number,
                'payment_method_types' => $invoice->payment_method === 'GCash' ? ['gcash', 'qrph'] : ['card', 'paymaya', 'dob', 'qrph', 'gcash'],
            ];

            $session = $paymongo->createCheckoutSession($payData);
            if (! $session['success'] || empty($session['checkout_url']) || empty($session['id'])) {
                throw ValidationException::withMessages([
                    'payment_method' => [$session['error'] ?? 'Online payment checkout could not be created.'],
                ]);
            }

            $invoice->update([
                'payment_url' => $session['checkout_url'],
                'payment_id' => $session['id'],
            ]);
        }

        // Ledger Posting: Recognize AR and Revenue
        if ($invoice->total_amount > 0) {
            $ledger = app(LedgerService::class);
            $ledger->seedDefaultAccounts(); // Ensure accounts exist

            $arAccount = Account::where('code', '1300')->first();
            $revAccount = Account::where('code', '4000')->first();
            $vatAccount = Account::where('code', '2400')->first();

            if ($arAccount && $revAccount && $vatAccount) {
                $ledger->recordEntry(
                    now()->toDateString(),
                    "Invoice finalized: {$invoice->invoice_number}",
                    [
                        [
                            'account_id' => $arAccount->id,
                            'debit' => $invoice->total_amount,
                            'credit' => 0,
                            'description' => "AR for Invoice {$invoice->invoice_number}",
                        ],
                        [
                            'account_id' => $revAccount->id,
                            'debit' => 0,
                            'credit' => $invoice->subtotal,
                            'description' => "Net service revenue for Invoice {$invoice->invoice_number}",
                        ],
                        [
                            'account_id' => $vatAccount->id,
                            'debit' => 0,
                            'credit' => $invoice->tax_amount,
                            'description' => "Output VAT for Invoice {$invoice->invoice_number}",
                        ],
                    ],
                    $invoice
                );
            }
        }

        // Immutable snapshot of the financial facts as sold (roadmap 2.5) — written once.
        $this->captureSnapshot($invoice);

        // Sync Joiner Departure seats to confirmed status so booked seats are grayed out for other incoming customers.
        $this->syncJoinerDepartureSeats($invoice);

        return $invoice->fresh();
    }

    /**
     * Synchronizes Joiner Departure seats to 'confirmed' status upon invoice creation or payment.
     */
    public function syncJoinerDepartureSeats(Invoice $invoice): void
    {
        $invoice->loadMissing(['booking', 'items']);
        $booking = $invoice->booking;
        $seatMap = $booking?->seat_map;
        $tourCode = $booking?->tour_code;
        $travelDate = $booking?->travel_date;

        if (! $seatMap || ! is_array($seatMap) || count($seatMap) === 0) {
            foreach ($invoice->items as $item) {
                if (is_array($item->item_metadata) && ! empty($item->item_metadata['selected_seats'])) {
                    $seatMap = (array) $item->item_metadata['selected_seats'];
                    break;
                }
                if (is_array($item->item_metadata) && ! empty($item->item_metadata['seat_map'])) {
                    $seatMap = (array) $item->item_metadata['seat_map'];
                    break;
                }
            }
        }

        if (! $seatMap || ! is_array($seatMap) || count($seatMap) === 0) {
            return;
        }

        $departure = null;
        if ($tourCode) {
            $departure = JoinerDeparture::where('code', $tourCode)->first();
        }

        if (! $departure && $travelDate) {
            $dateStr = is_string($travelDate) ? explode('T', $travelDate)[0] : $travelDate->toDateString();
            $invoiceItem = $invoice->items->first();
            if ($invoiceItem && $invoiceItem->service_id) {
                $departure = JoinerDeparture::where('service_id', $invoiceItem->service_id)
                    ->whereDate('starts_at', $dateStr)
                    ->first();
            }
        }

        if (! $departure) {
            return;
        }

        $cleanSeats = array_map(function ($code) {
            return preg_replace('/^(seat|s)\s*/i', '', trim((string) $code));
        }, $seatMap);

        if ($invoice->status === 'cancelled') {
            JoinerDepartureSeat::where('departure_id', $departure->id)
                ->whereIn('seat_code', $cleanSeats)
                ->update([
                    'status' => 'available',
                    'reservation_id' => null,
                    'held_until' => null,
                ]);
        } else {
            JoinerDepartureSeat::where('departure_id', $departure->id)
                ->whereIn('seat_code', $cleanSeats)
                ->update([
                    'status' => 'confirmed',
                    'held_until' => null,
                ]);
        }

        $confirmedCount = JoinerDepartureSeat::where('departure_id', $departure->id)
            ->whereIn('status', ['confirmed', 'occupied'])
            ->count();
        $heldCount = JoinerDepartureSeat::where('departure_id', $departure->id)
            ->where('status', 'held')
            ->count();

        $departure->update([
            'confirmed_count' => $confirmedCount,
            'held_count' => $heldCount,
        ]);
    }

    /**
     * Freeze the invoice's billed facts (customer as sold, line items, prices, totals)
     * into finalized_snapshot. Written exactly once; later price/customer/service edits
     * can never rewrite this record. Corrections must be new documents, not edits.
     */
    public function captureSnapshot(Invoice $invoice): void
    {
        if (! empty($invoice->finalized_snapshot)) {
            return; // already frozen — immutable
        }

        $invoice->loadMissing('items');

        $items = $invoice->items->map(fn ($item) => [
            'service_id' => $item->service_id,
            'passport_case_id' => $item->passport_case_id,
            'service_name' => $item->item_name ?? optional(Service::find($item->service_id))->name,
            'service_type' => $item->service_type,
            'description' => $item->item_description,
            'metadata' => $item->item_metadata,
            'quantity' => $item->quantity,
            'unit_price' => $item->unit_price,
            'total_price' => $item->total_price,
            'adults' => $item->adults,
            'children' => $item->children,
            'adult_price' => $item->adult_price,
            'child_price' => $item->child_price,
        ])->all();

        $snapshot = [
            'captured_at' => now()->toIso8601String(),
            'customer' => [
                'id' => $invoice->customer_id,
                'name' => $invoice->customer_name,
                'address' => $invoice->customer_address,
                'email' => $invoice->customer_email,
                'contact' => $invoice->customer_contact,
            ],
            'items' => $items,
            'totals' => [
                'subtotal' => $invoice->subtotal,
                'tax_amount' => $invoice->tax_amount,
                'total_amount' => $invoice->total_amount,
            ],
        ];

        $invoice->forceFill([
            'finalized_snapshot' => $snapshot,
            'finalized_at' => now(),
        ])->save();
    }

    /**
     * Idempotent sales-order bridge for specialized checkouts whose booking is created after
     * finalizeWithinTransaction(), plus collection sync, customer email and in-app alert.
     * Typed invoice checkouts capture fulfillment inside their caller's transaction first;
     * this compatibility capture then becomes a no-op. Must run after the caller commits so
     * mail and notification failures never roll back the financial transaction.
     *
     * $context: ['actor' => ?User, 'source' => 'pos'|'contract', 'contract' => ?Contract]
     */
    public function afterCommit(Invoice $invoice, array $context = []): void
    {
        app(SalesOrderService::class)->captureInvoice($invoice, ($context['actor'] ?? null)?->id ?? $invoice->created_by);
        app(BillingCollectionService::class)->syncCollection($invoice);

        $notificationEmail = $invoice->notificationEmail();
        if ($notificationEmail) {
            try {
                @set_time_limit(120);
                Mail::to($notificationEmail)->send(new TransactionNotificationMail($invoice));
            } catch (\Exception $mailEx) {
                \Log::error("Failed to send POS transaction email to {$notificationEmail}: ".$mailEx->getMessage());
            }

            if (($context['source'] ?? null) === 'contract') {
                try {
                    Mail::to($notificationEmail)->send(new BookingConfirmationMail($invoice, $context['contract'] ?? null));
                } catch (\Exception $mailEx) {
                    \Log::error("Failed to send booking confirmation email to {$notificationEmail}: ".$mailEx->getMessage());
                }
            }
        }

        /** @var User|null $actor */
        $actor = $context['actor'] ?? null;
        if ($actor) {
            $actor->notify(new SystemAlert(
                'POS Transaction Completed',
                "Invoice #{$invoice->invoice_number} was successfully created for {$invoice->total_amount} PHP.",
                'success',
                "/accounting/transactions/{$invoice->id}"
            ));
        }
    }
}
