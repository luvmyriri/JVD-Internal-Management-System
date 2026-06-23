<?php

namespace App\Http\Services;

use App\Exceptions\MaxPaxExceededException;
use App\Mail\BookingConfirmationMail;
use App\Mail\TransactionNotificationMail;
use App\Models\Contract;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Service;
use App\Models\User;
use App\Notifications\SystemAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

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
    public function calculateItems(array $items, ?string $travelDate, ?int $requestPaxCount): array
    {
        $subtotal = 0;
        $taxRate = 0.12; // 12% VAT
        $processedItems = [];

        foreach ($items as $item) {
            $service = Service::find($item['service_id']);

            if ($service->max_pax && $travelDate) {
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
                    ->where('invoice_items.service_id', $service->id)
                    ->where('invoices.travel_date', $travelDate)
                    ->where('invoices.status', '!=', 'cancelled')
                    ->sum(DB::raw('CASE WHEN invoice_items.adults IS NOT NULL OR invoice_items.children IS NOT NULL THEN COALESCE(invoice_items.adults, 0) + COALESCE(invoice_items.children, 0) ELSE invoice_items.quantity END'));

                $remaining = $service->max_pax - (int) $alreadyBooked;

                if ($paxToAdd > $remaining) {
                    throw new MaxPaxExceededException($service->name, $paxToAdd, $remaining, $service->max_pax, $travelDate);
                }
            }

            $unitPrice = isset($item['unit_price']) ? (double) $item['unit_price'] : $service->price;
            $itemTotal = $unitPrice * $item['quantity'];
            $subtotal += $itemTotal;

            $processedItems[] = [
                'service_id' => $service->id,
                'quantity' => $item['quantity'],
                'unit_price' => $unitPrice,
                'total_price' => $itemTotal,
                'adults' => $item['adults'] ?? null,
                'children' => $item['children'] ?? null,
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
    public function computePaymentStatus(string $paymentMethod, string $paymentType, float $totalAmount, float $amountReceived): array
    {
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
     * Resolves an existing customer by id/email/phone, or auto-registers a new one from a
     * free-text name. Extracted verbatim from BillingController::store's customer block.
     */
    public function resolveCustomerId(?int $customerId, ?string $name, ?string $email, ?string $contact, ?string $address): ?int
    {
        if ($customerId) {
            return $customerId;
        }

        if (!$name) {
            return null;
        }

        $existingCustomer = null;
        if ($email) {
            $existingCustomer = Customer::where('email', $email)->first();
        }
        if (!$existingCustomer && $contact) {
            $existingCustomer = Customer::where('phone', $contact)->first();
        }

        if ($existingCustomer) {
            $updatedData = [];
            if (!$existingCustomer->address && $address) {
                $updatedData['address'] = $address;
            }
            if (!empty($updatedData)) {
                $existingCustomer->update($updatedData);
            }
            return $existingCustomer->id;
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
     * Recomputes status/balance, creates the PayMongo session (GCash/Card), and auto-generates
     * a Job Order for bus-related services. Must run inside the caller's existing DB transaction
     * (matches BillingController::store's original placement of this logic before DB::commit()).
     */
    public function finalizeWithinTransaction(Invoice $invoice, array $processedItems): Invoice
    {
        // Conflict Check: Prevent double-booking driver or bus on overlapping date range
        if ($invoice->travel_date) {
            $dateStr = $invoice->travel_date;
            
            if ($invoice->bus_id) {
                // Check local travels
                $localConflict = \DB::table('local_travels')
                    ->where('bus_id', $invoice->bus_id)
                    ->where('travel_date', $dateStr)
                    ->where(function ($q) use ($invoice) {
                        $q->where('reference_type', '!=', 'invoice')
                          ->orWhere('reference_id', '!=', $invoice->id);
                    })
                    ->first();
                if ($localConflict) {
                    throw new \InvalidArgumentException("Vehicle is already reserved for a local travel on " . $dateStr . ".");
                }

                // Check international travels
                $intlConflict = \DB::table('international_travels')
                    ->where('bus_id', $invoice->bus_id)
                    ->where('travel_date', $dateStr)
                    ->first();
                if ($intlConflict) {
                    throw new \InvalidArgumentException("Vehicle is already reserved for an international travel on " . $dateStr . ".");
                }

                // Check PMS
                $pmsConflict = \DB::table('pms_schedules')
                    ->where('bus_id', $invoice->bus_id)
                    ->where('maintenance_date', $dateStr)
                    ->first();
                if ($pmsConflict) {
                    throw new \InvalidArgumentException("Vehicle is under maintenance (PMS) on " . $dateStr . ".");
                }
            }

            if ($invoice->driver_id) {
                // Check local travels
                $driverLocalConflict = \DB::table('local_travels')
                    ->where('driver_id', $invoice->driver_id)
                    ->where('travel_date', $dateStr)
                    ->where(function ($q) use ($invoice) {
                        $q->where('reference_type', '!=', 'invoice')
                          ->orWhere('reference_id', '!=', $invoice->id);
                    })
                    ->first();
                if ($driverLocalConflict) {
                    throw new \InvalidArgumentException("Driver is already reserved for a local travel on " . $dateStr . ".");
                }

                // Check international travels
                $driverIntlConflict = \DB::table('international_travels')
                    ->where('driver_id', $invoice->driver_id)
                    ->where('travel_date', $dateStr)
                    ->first();
                if ($driverIntlConflict) {
                    throw new \InvalidArgumentException("Driver is already reserved for an international travel on " . $dateStr . ".");
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

        if (in_array($invoice->payment_method, ['GCash', 'Card']) && !$invoice->payment_id) {
            $paymongo = new \App\Services\PayMongoService();
            $payData = [
                'line_items' => array_map(function ($item) {
                    $service = Service::find($item['service_id']);
                    $displayName = $service->name;
                    if (isset($item['adults']) || isset($item['children'])) {
                        $adultsCount = $item['adults'] ?? 0;
                        $childrenCount = $item['children'] ?? 0;
                        $displayName .= " ({$adultsCount} Adults, {$childrenCount} Children)";
                    }
                    return [
                        'amount' => (int) ($item['unit_price'] * 100),
                        'currency' => 'PHP',
                        'name' => $displayName,
                        'quantity' => $item['quantity'],
                    ];
                }, $processedItems),
                'description' => "JVD Order #{$invoice->invoice_number}",
                'payment_method_types' => $invoice->payment_method === 'GCash' ? ['gcash'] : ['card'],
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
            $service = Service::find($pItem['service_id']);
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
            }
        }

        if ($hasBusService) {
            $jobOrderService = app(\App\Http\Services\JobOrderService::class);
            $jobOrderService->create([
                'customer_id' => $invoice->customer_id ?? 1,
                'bus_id' => $invoice->bus_id,
                'service_type' => 'bus_rental',
                'service_date' => $busServiceDate ?? $invoice->travel_date ?? date('Y-m-d', strtotime('+1 day')),
                'destination' => $busDestination ?? $invoice->tour_code ?? $invoice->pickup_location ?? 'Not Specified',
                'total_cost' => $invoice->total_amount,
                'notes' => "Auto-generated from Invoice #{$invoice->invoice_number}.\nServices:\n{$busServiceDescription}\nArrival: " . ($invoice->arrival_datetime ?? 'N/A') . "\nDeparture: " . ($invoice->departure_datetime ?? 'N/A') . "\nNotes: {$invoice->notes}",
                'invoice_id' => $invoice->id,
            ], $invoice->created_by ?? 1);
        }

        return $invoice->fresh();
    }

    /**
     * Collection ledger sync + customer receipt email + optional booking-confirmation email +
     * in-app alert. Must run AFTER the caller's DB::commit() (unchanged from the original
     * ordering — mail/notification failures never roll back the financial transaction).
     *
     * $context: ['actor' => ?User, 'source' => 'pos'|'contract', 'contract' => ?Contract]
     */
    public function afterCommit(Invoice $invoice, array $context = []): void
    {
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
