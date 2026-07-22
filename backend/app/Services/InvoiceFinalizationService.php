<?php

namespace App\Services;

use App\Exceptions\MaxPaxExceededException;
use App\Mail\BookingConfirmationMail;
use App\Mail\TransactionNotificationMail;
use App\Models\Contract;
use App\Models\Customer;
use App\Models\CustomTransactionDetail;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PassportCase;
use App\Models\Service;
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
    public function calculateItems(array $items, ?string $travelDate, ?int $requestPaxCount, ?float $customTaxRate = null): array
    {
        $subtotal = 0;
        $taxRate = $customTaxRate !== null ? $customTaxRate : (float) \App\Models\SystemSetting::getValue('vat_rate', 0.12);
        $processedItems = [];

        foreach ($items as $item) {
            $service = !empty($item['service_id']) ? Service::lockForUpdate()->find($item['service_id']) : null;
            if (!empty($item['service_id']) && !$service) {
                throw ValidationException::withMessages(['items' => ['The selected catalog service no longer exists.']]);
            }
            if (!$service && empty($item['item_name'])) {
                throw ValidationException::withMessages(['items' => ['A bespoke line must include its item name.']]);
            }

            if ($service?->max_pax && $travelDate) {
                $paxToAdd = 0;
                if (isset($item['adults']) || isset($item['children'])) {
                    $paxToAdd = ($item['adults'] ?? 0) + ($item['children'] ?? 0);
                } else {
                    $paxToAdd = $item['quantity'];
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

            $adults = $item['adults'] ?? null;
            $children = $item['children'] ?? null;
            $unitPrice = isset($item['unit_price']) ? (double) $item['unit_price'] : (double) ($service?->price ?? 0);

            if ($adults !== null || $children !== null) {
                $adultCount = (int) ($adults ?? 0);
                $childCount = (int) ($children ?? 0);
                $adultUnit = (double) ($item['adult_price'] ?? $service?->adult_price ?? $unitPrice);
                $childUnit = (double) ($item['child_price'] ?? $service?->child_price ?? $unitPrice);
                $itemTotal = ($adultCount * $adultUnit) + ($childCount * $childUnit);
                $effectiveQty = $adultCount + $childCount;
                if ($effectiveQty > 0) {
                    $unitPrice = $itemTotal / $effectiveQty;
                }
            } else {
                $itemTotal = $unitPrice * $item['quantity'];
                $effectiveQty = $item['quantity'];
            }

            $subtotal += $itemTotal;

            $processedItems[] = [
                'service_id' => $service?->id,
                'passport_case_id' => $item['passport_case_id'] ?? null,
                'item_name' => $item['item_name'] ?? $service?->name,
                'service_type' => $item['service_type'] ?? $service?->service_type ?? 'custom_arrangement',
                'item_description' => $item['item_description'] ?? $item['description'] ?? $service?->description,
                'item_metadata' => $item['item_metadata'] ?? null,
                'quantity' => $effectiveQty ?? $item['quantity'],
                'unit_price' => $unitPrice,
                'total_price' => $itemTotal,
                'adults' => $adults,
                'children' => $children,
                'adult_price' => isset($item['adults']) || isset($item['children']) ? (double) ($item['adult_price'] ?? $service?->adult_price ?? $unitPrice) : null,
                'child_price' => isset($item['adults']) || isset($item['children']) ? (double) ($item['child_price'] ?? $service?->child_price ?? $unitPrice) : null,
                'service_date' => $item['service_date'] ?? null,
                'destination' => $item['destination'] ?? null,
            ];
        }

        $taxAmount = $subtotal * $taxRate;
        $totalAmount = $subtotal + $taxAmount;

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

        // GCash/Card: pending until callback
        return ['status' => 'pending_payment', 'balance' => $totalAmount];
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

            $service = !empty($item['service_id']) ? Service::find($item['service_id']) : null;
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

        if (!$existingCustomer && $email) {
            $existingCustomer = Customer::where('email', $email)->first();
        }
        if (!$existingCustomer && $contact) {
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

            if (!empty($updatedData)) {
                $existingCustomer->update($updatedData);
            }
            return $existingCustomer->id;
        }

        if (!$name) {
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
     * @param array<int, int|string|null> $itemPassportCaseIds
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

            if (!$passportCase) {
                throw ValidationException::withMessages([
                    $errorKey => ['The selected passport or visa case no longer exists.'],
                ]);
            }

            if (!$customerId || (int) $passportCase->customer_id !== (int) $customerId) {
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

                if (!$isSeatMapBooking) {
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
                    $ttConflict = \App\Models\TripTicket::where('bus_id', $booking->bus_id)
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
                    throw new \InvalidArgumentException("Vehicle (Bus #{$booking->bus_id}) is already reserved/booked for travel on " . $dateStr . ".");
                }

                // Check PMS
                $pmsConflict = \DB::table('pms_schedules')
                    ->where('bus_id', $booking->bus_id)
                    ->where('maintenance_date', $dateStr)
                    ->lockForUpdate()
                    ->first();
                if ($pmsConflict) {
                    throw new \InvalidArgumentException("Vehicle is under maintenance (PMS) on " . $dateStr . ".");
                }
            }

            if ($booking->driver_id && !$isSeatMapBooking) {
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
                $driverTtConflict = \App\Models\TripTicket::where('driver_id', $booking->driver_id)
                    ->where('date_of_travel', $dateStr)
                    ->where('status', '!=', 'cancelled')
                    ->where(function ($q) use ($invoice) {
                        $q->whereNull('invoice_id')
                          ->orWhere('invoice_id', '!=', $invoice->id);
                    })
                    ->lockForUpdate()
                    ->first();

                if ($driverTravelConflict || $driverTtConflict) {
                    throw new \InvalidArgumentException("Driver is already assigned/reserved for travel on " . $dateStr . ".");
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

        if (in_array($invoice->payment_method, ['GCash', 'Card']) && !$invoice->payment_id && (float) $invoice->total_amount > 0) {
            $paymongo = new \App\Services\PayMongoService();
            $payData = [
                'line_items' => $this->buildPayMongoLineItems($invoice, $processedItems),
                'description' => "JVD Order #{$invoice->invoice_number}",
                'payment_method_types' => $invoice->payment_method === 'GCash' ? ['gcash'] : ['card', 'paymaya', 'dob', 'qrph'],
            ];

            $session = $paymongo->createCheckoutSession($payData);
            if ($session['success']) {
                $invoice->update([
                    'payment_url' => $session['checkout_url'],
                    'payment_id' => $session['id'],
                ]);
            }
        }

        $hasBusService = false;
        $busServiceDescription = '';
        $busServiceDate = null;
        $busDestination = null;

        foreach ($processedItems as $pItem) {
            $service = !empty($pItem['service_id']) ? Service::find($pItem['service_id']) : null;
            if ($service) {
                $cat = strtolower($service->category);
                $name = strtolower($service->name);
                if (in_array($cat, ['transport', 'package', 'bus rental', 'educational tour', 'tour package', 'joiners'])
                    || str_contains($cat, 'bus')
                    || str_contains($cat, 'tour')
                    || str_contains($name, 'bus')
                    || str_contains($name, 'tour')
                ) {
                    $hasBusService = true;
                    $busServiceDescription .= "- {$service->name} (Qty: {$pItem['quantity']})\n";
                    if (!empty($pItem['service_date'])) $busServiceDate = $pItem['service_date'];
                    if (!empty($pItem['destination'])) $busDestination = $pItem['destination'];
                }
            } elseif (in_array($pItem['service_type'] ?? null, ['bus_rental', 'transfer_service', 'educational_tour'], true)) {
                $hasBusService = true;
                $busServiceDescription .= '- '.($pItem['item_name'] ?? 'Transport service')." (Qty: {$pItem['quantity']})\n";
                if (!empty($pItem['service_date'])) $busServiceDate = $pItem['service_date'];
                if (!empty($pItem['destination'])) $busDestination = $pItem['destination'];
            }
        }

        if ($hasBusService && $booking && $booking->bus_id) {
            DB::transaction(function () use ($invoice, $booking, $busServiceDate, $busDestination) {
                $year = now()->year;
                $latest = TripTicket::where('control_no', 'like', "DTT-{$year}-%")
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();
                $sequence = 1;
                if ($latest) {
                    $parts = explode('-', $latest->control_no);
                    $sequence = (int) end($parts) + 1;
                }
                $controlNo = sprintf('DTT-%d-%04d', $year, $sequence);

                $dateOfTravel = $busServiceDate ?? $booking->travel_date ?? now()->addDay()->toDateString();
                if (is_string($dateOfTravel)) {
                    $dateOfTravel = explode('T', $dateOfTravel)[0];
                }

                $existingTt = TripTicket::where('invoice_id', $invoice->id)
                    ->orWhere(function ($q) use ($booking, $dateOfTravel) {
                        $q->where('bus_id', $booking->bus_id)
                          ->where('driver_id', $booking->driver_id)
                          ->where('date_of_travel', $dateOfTravel)
                          ->where('status', '!=', 'cancelled');
                    })
                    ->first();

                if ($existingTt) {
                    $existingTt->update([
                        'invoice_id'       => $invoice->id,
                        'issue_date'       => now()->toDateString(),
                        'date_of_travel'   => $dateOfTravel,
                        'pick_up'          => $booking->pickup_location ?? 'TBD',
                        'destination'      => $booking->tour_code ?? 'TBD',
                        'drop_off'         => $busDestination ?? 'TBD',
                        'no_of_passengers' => $booking->pax_count ?? 1,
                        'bus_id'           => $booking->bus_id,
                        'driver_id'        => $booking->driver_id,
                    ]);
                } else {
                    TripTicket::create([
                        'control_no'       => $controlNo,
                        'issue_date'       => now()->toDateString(),
                        'date_of_travel'   => $dateOfTravel,
                        'pick_up'          => $booking->pickup_location ?? 'TBD',
                        'destination'      => $booking->tour_code ?? 'TBD',
                        'drop_off'         => $busDestination ?? 'TBD',
                        'no_of_passengers' => $booking->pax_count ?? 1,
                        'bus_id'           => $booking->bus_id,
                        'driver_id'        => $booking->driver_id,
                        'status'           => 'draft',
                        'requested_by'     => $invoice->created_by,
                        'invoice_id'       => $invoice->id,
                    ]);
                }
            });
        }

        // Ledger Posting: Recognize AR and Revenue
        if ($invoice->total_amount > 0) {
            $ledger = app(\App\Services\LedgerService::class);
            $ledger->seedDefaultAccounts(); // Ensure accounts exist
            
            $arAccount = \App\Models\Account::where('code', '1300')->first();
            $revAccount = \App\Models\Account::where('code', '4000')->first();
            $vatAccount = \App\Models\Account::where('code', '2400')->first();

            if ($arAccount && $revAccount && $vatAccount) {
                $ledger->recordEntry(
                    now()->toDateString(),
                    "Invoice finalized: {$invoice->invoice_number}",
                    [
                        [
                            'account_id' => $arAccount->id,
                            'debit' => $invoice->total_amount,
                            'credit' => 0,
                            'description' => "AR for Invoice {$invoice->invoice_number}"
                        ],
                        [
                            'account_id' => $revAccount->id,
                            'debit' => 0,
                            'credit' => $invoice->subtotal,
                            'description' => "Net service revenue for Invoice {$invoice->invoice_number}"
                        ],
                        [
                            'account_id' => $vatAccount->id,
                            'debit' => 0,
                            'credit' => $invoice->tax_amount,
                            'description' => "Output VAT for Invoice {$invoice->invoice_number}"
                        ]
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

        if (!$seatMap || !is_array($seatMap) || count($seatMap) === 0) {
            foreach ($invoice->items as $item) {
                if (is_array($item->item_metadata) && !empty($item->item_metadata['selected_seats'])) {
                    $seatMap = (array) $item->item_metadata['selected_seats'];
                    break;
                }
                if (is_array($item->item_metadata) && !empty($item->item_metadata['seat_map'])) {
                    $seatMap = (array) $item->item_metadata['seat_map'];
                    break;
                }
            }
        }

        if (!$seatMap || !is_array($seatMap) || count($seatMap) === 0) {
            return;
        }

        $departure = null;
        if ($tourCode) {
            $departure = \App\Models\JoinerDeparture::where('code', $tourCode)->first();
        }

        if (!$departure && $travelDate) {
            $dateStr = is_string($travelDate) ? explode('T', $travelDate)[0] : $travelDate->toDateString();
            $invoiceItem = $invoice->items->first();
            if ($invoiceItem && $invoiceItem->service_id) {
                $departure = \App\Models\JoinerDeparture::where('service_id', $invoiceItem->service_id)
                    ->whereDate('starts_at', $dateStr)
                    ->first();
            }
        }

        if (!$departure) {
            return;
        }

        $cleanSeats = array_map(function ($code) {
            return preg_replace('/^(seat|s)\s*/i', '', trim((string) $code));
        }, $seatMap);

        if ($invoice->status === 'cancelled') {
            \App\Models\JoinerDepartureSeat::where('departure_id', $departure->id)
                ->whereIn('seat_code', $cleanSeats)
                ->update([
                    'status' => 'available',
                    'reservation_id' => null,
                    'held_until' => null,
                ]);
        } else {
            \App\Models\JoinerDepartureSeat::where('departure_id', $departure->id)
                ->whereIn('seat_code', $cleanSeats)
                ->update([
                    'status' => 'confirmed',
                    'held_until' => null,
                ]);
        }

        $confirmedCount = \App\Models\JoinerDepartureSeat::where('departure_id', $departure->id)
            ->whereIn('status', ['confirmed', 'occupied'])
            ->count();
        $heldCount = \App\Models\JoinerDepartureSeat::where('departure_id', $departure->id)
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
        if (!empty($invoice->finalized_snapshot)) {
            return; // already frozen — immutable
        }

        $invoice->loadMissing('items');

        $items = $invoice->items->map(fn ($item) => [
            'service_id'   => $item->service_id,
            'passport_case_id' => $item->passport_case_id,
            'service_name' => $item->item_name ?? optional(Service::find($item->service_id))->name,
            'service_type' => $item->service_type,
            'description'  => $item->item_description,
            'metadata'     => $item->item_metadata,
            'quantity'     => $item->quantity,
            'unit_price'   => $item->unit_price,
            'total_price'  => $item->total_price,
            'adults'       => $item->adults,
            'children'     => $item->children,
            'adult_price'  => $item->adult_price,
            'child_price'  => $item->child_price,
        ])->all();

        $snapshot = [
            'captured_at' => now()->toIso8601String(),
            'customer' => [
                'id'      => $invoice->customer_id,
                'name'    => $invoice->customer_name,
                'address' => $invoice->customer_address,
                'email'   => $invoice->customer_email,
                'contact' => $invoice->customer_contact,
            ],
            'items'  => $items,
            'totals' => [
                'subtotal'     => $invoice->subtotal,
                'tax_amount'   => $invoice->tax_amount,
                'total_amount' => $invoice->total_amount,
            ],
        ];

        $invoice->forceFill([
            'finalized_snapshot' => $snapshot,
            'finalized_at'       => now(),
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
        app(\App\Services\SalesOrderService::class)->captureInvoice($invoice, ($context['actor'] ?? null)?->id ?? $invoice->created_by);
        app(\App\Services\BillingCollectionService::class)->syncCollection($invoice);

        if ($invoice->customer_email) {
            try {
                @set_time_limit(120);
                Mail::to($invoice->customer_email)->send(new TransactionNotificationMail($invoice));
            } catch (\Exception $mailEx) {
                \Log::error("Failed to send POS transaction email to {$invoice->customer_email}: " . $mailEx->getMessage());
            }

            if (($context['source'] ?? null) === 'contract') {
                try {
                    Mail::to($invoice->customer_email)->send(new BookingConfirmationMail($invoice, $context['contract'] ?? null));
                } catch (\Exception $mailEx) {
                    \Log::error("Failed to send booking confirmation email to {$invoice->customer_email}: " . $mailEx->getMessage());
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
                '/accounting/billing'
            ));
        }
    }
}
