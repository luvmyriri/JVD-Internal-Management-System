<?php

namespace App\Services;

use App\Models\ActivityBooking;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderEvent;
use App\Models\SalesOrderItem;
use App\Models\Service;
use App\Models\User;
use App\Services\SalesReferenceService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SalesOrderService
{
    private const TYPED_CAPTURE_TYPES = [
        'private_tour',
        'visa_assistance',
        'passport_assistance',
        'flight_booking',
        'accommodation_booking',
        'ticket_booking',
        'activity_booking',
        'transfer_service',
        'custom_arrangement',
    ];

    public function __construct(private readonly SalesOrderFulfillmentService $fulfillments) {}

    public function createDraft(array $data, int $actorId): SalesOrder
    {
        return DB::transaction(function () use ($data, $actorId) {
            $customerId = $data['customer_id'] ?? null;
            if (!$customerId && !empty($data['customer_name'])) {
                $customerId = app(InvoiceFinalizationService::class)->resolveCustomerId(
                    null, $data['customer_name'], $data['customer_email'] ?? null,
                    $data['customer_contact'] ?? null, $data['customer_address'] ?? null
                );
            }

            $order = SalesOrder::create([
                'order_number' => $this->number('ORD'), 'customer_id' => $customerId, 'agent_id' => $actorId,
                'status' => 'draft', 'currency' => 'PHP', 'notes' => $data['notes'] ?? null,
                'metadata' => ['customer_snapshot' => [
                    'name'=>$data['customer_name'] ?? null, 'email'=>$data['customer_email'] ?? null,
                    'contact'=>$data['customer_contact'] ?? null, 'address'=>$data['customer_address'] ?? null,
                ]],
            ]);
            $this->event($order, 'order_created', null, 'draft', [], $actorId);
            foreach ($data['items'] ?? [] as $item) $this->addItem($order, $item, $actorId);
            return $order->fresh($this->relations());
        });
    }

    public function addItem(SalesOrder $order, array $data, int $actorId): SalesOrderItem
    {
        return DB::transaction(function () use ($order, $data, $actorId) {
            $order = SalesOrder::lockForUpdate()->findOrFail($order->id);
            $this->assertEditable($order);
            $type = $data['service_type'];
            if (!array_key_exists($type, config('service_types'))) {
                throw ValidationException::withMessages(['service_type' => 'Unknown service type.']);
            }
            $service = Service::lockForUpdate()->findOrFail($data['service_id']);
            if ($service->service_type && $service->service_type !== $type) {
                throw ValidationException::withMessages(['service_id' => 'The selected catalog service belongs to a different service engine.']);
            }
            if (!$service->service_type) $service->update(['service_type' => $type]);
            if (!$service->is_active) throw ValidationException::withMessages(['service_id' => 'The selected service is inactive.']);

            $details = $this->fulfillments->validate($type, $data['details'] ?? [], $service->id);
            $quantity = round((float) ($data['quantity'] ?? 1), 2);
            $unitPrice = round((float) ($data['unit_price'] ?? $service->price), 2);
            if ($quantity <= 0 || $unitPrice < 0) throw ValidationException::withMessages(['quantity' => 'Quantity and price must be valid non-negative values.']);
            $subtotal = round($quantity * $unitPrice, 2);
            $taxRate = (float) \App\Models\SystemSetting::getValue('vat_rate', 0.12);
            $tax = round($subtotal * $taxRate, 2);
            [$start, $end, $travelers] = $this->scheduleFor($type, $details);

            $item = SalesOrderItem::create([
                'sales_order_id'=>$order->id,'line_number'=>(int) $order->items()->reorder()->max('line_number') + 1,
                'service_type'=>$type,'service_id'=>$service->id,'status'=>'draft','title'=>$data['title'] ?? $service->name,
                'description'=>$data['description'] ?? $service->description,'quantity'=>$quantity,'unit_price'=>$unitPrice,
                'subtotal'=>$subtotal,'tax_amount'=>$tax,'total_amount'=>round($subtotal + $tax, 2),
                'supplier_cost'=>$details['supplier_cost'] ?? null,'scheduled_start'=>$start,'scheduled_end'=>$end,
                'traveler_count'=>$travelers,'details_snapshot'=>$details,
            ]);
            $fulfillment = $this->fulfillments->create($item, $details);
            $item->fulfillment()->associate($fulfillment);
            $item->save();
            $this->recalculate($order);
            $this->event($order, 'item_added', null, 'draft', ['item_id'=>$item->id,'service_type'=>$type], $actorId, $item);
            return $item->fresh(['service', 'fulfillment']);
        });
    }

    public function removeItem(SalesOrder $order, SalesOrderItem $item, int $actorId): void
    {
        DB::transaction(function () use ($order, $item, $actorId) {
            $order = SalesOrder::lockForUpdate()->findOrFail($order->id);
            $this->assertEditable($order);
            if ($item->sales_order_id !== $order->id) abort(404);
            $payload = ['item_id'=>$item->id,'service_type'=>$item->service_type,'title'=>$item->title];
            $item->fulfillment?->delete();
            $item->delete();
            $this->renumber($order);
            $this->recalculate($order);
            $this->event($order, 'item_removed', 'draft', 'draft', $payload, $actorId);
        });
    }

    public function markQuoted(SalesOrder $order, int $actorId): SalesOrder
    {
        return DB::transaction(function () use ($order, $actorId) {
            $order = SalesOrder::lockForUpdate()->with('items')->findOrFail($order->id);
            $this->assertEditable($order);
            if ($order->items->isEmpty()) throw ValidationException::withMessages(['items' => 'Add at least one service before issuing a quote.']);
            $from = $order->status;
            $order->update(['status'=>'quoted']);
            $this->event($order, 'quotation_issued', $from, 'quoted', [], $actorId);
            return $order->fresh($this->relations());
        });
    }

    public function confirm(SalesOrder $order, array $payment, int $actorId): SalesOrder
    {
        $invoice = DB::transaction(function () use ($order, $payment, $actorId) {
            $order = SalesOrder::lockForUpdate()->with(['items.service','items.fulfillment','items.order','customer'])->findOrFail($order->id);
            $this->assertEditable($order);
            if (!$order->customer_id || !$order->customer) throw ValidationException::withMessages(['customer_id' => 'Select or create the customer before confirmation.']);
            if ($order->items->isEmpty()) throw ValidationException::withMessages(['items' => 'Add at least one service before confirmation.']);
            foreach ($order->items as $item) {
                if (!$item->service_id || !$item->fulfillment) throw ValidationException::withMessages(['items' => "Line {$item->line_number} is incomplete."]);
                Service::lockForUpdate()->findOrFail($item->service_id);
                $this->reserveAndConfirm($item);
            }

            $total = (float) $order->total_amount;
            $received = round((float) ($payment['amount_received'] ?? 0), 2);
            $method = $payment['payment_method'];
            $paymentType = $payment['payment_type'];
            if ($method === 'Cash' && $paymentType === 'full' && $received < $total) {
                throw ValidationException::withMessages(['amount_received' => 'Full cash payment must cover the order total.']);
            }
            if ($paymentType === 'downpayment' && $received <= 0) {
                throw ValidationException::withMessages(['amount_received' => 'A downpayment must be greater than zero.']);
            }
            $state = app(InvoiceFinalizationService::class)->computePaymentStatus($method, $paymentType, $total, $received);
            $customer = $order->customer;
            $name = trim(implode(' ', array_filter([$customer->first_name, $customer->middle_name, $customer->last_name, $customer->suffix])));
            $invoice = Invoice::create([
                'invoice_number'=>$this->number('INV'),'customer_id'=>$customer->id,'customer_name'=>$name,
                'customer_address'=>$customer->address,'customer_email'=>$customer->email,'customer_contact'=>$customer->phone,
                'subtotal'=>$order->subtotal,'tax_amount'=>$order->tax_amount,'total_amount'=>$order->total_amount,
                'amount_received'=>$received,'change'=>max(0, $received - $total),'payment_method'=>$method,
                'payment_type'=>$paymentType,'balance'=>$state['balance'],'due_date'=>$payment['due_date'] ?? optional($order->travel_starts_at)->toDateString(),
                'status'=>$state['status'],'created_by'=>$actorId,'notes'=>$order->notes,
            ]);
            $processed = [];
            foreach ($order->items as $item) {
                InvoiceItem::create(['invoice_id'=>$invoice->id,'service_id'=>$item->service_id,'quantity'=>$item->quantity,'unit_price'=>$item->unit_price,'total_price'=>$item->subtotal]);
                $processed[] = ['service_id'=>$item->service_id,'quantity'=>$item->quantity,'unit_price'=>$item->unit_price,'total_price'=>$item->subtotal];
            }
            $invoice = app(InvoiceFinalizationService::class)->finalizeWithinTransaction($invoice, $processed);
            $from = $order->status;
            $order->update([
                'invoice_id'=>$invoice->id,'status'=>$invoice->status === 'pending_payment' ? 'awaiting_payment' : 'confirmed',
                'amount_paid'=>max(0, $total - (float) $invoice->balance),'balance'=>$invoice->balance,
            ]);
            foreach ($order->items as $item) {
                app(TripTicketService::class)->ensureDraftForSalesItem($item, $actorId);
            }
            $this->event($order, 'order_confirmed', $from, $order->status, ['invoice_id'=>$invoice->id], $actorId);
            return $invoice;
        });

        app(InvoiceFinalizationService::class)->afterCommit($invoice, ['actor'=>User::find($actorId),'source'=>'sales_order']);
        return $order->fresh($this->relations());
    }

    /** Make every legacy or specialized checkout visible in the shared order economy. */
    public function captureInvoice(Invoice $invoice, ?int $actorId = null): SalesOrder
    {
        return DB::transaction(function () use ($invoice, $actorId) {
            $invoice = Invoice::lockForUpdate()->with(['items.service','joinerReservation','charterBooking','educationalTourBooking'])->findOrFail($invoice->id);
            $invoiceItems = $invoice->items->sortBy('id')->values();
            $legacy = $this->invoiceFulfillment($invoice);
            $order = SalesOrder::where('invoice_id', $invoice->id)->lockForUpdate()->first();
            $created = !$order;

            if (!$order) {
                $order = SalesOrder::create([
                    'order_number'=>$this->number('ORD'),'customer_id'=>$invoice->customer_id,'invoice_id'=>$invoice->id,
                    'agent_id'=>$actorId ?? $invoice->created_by,'status'=>$invoice->status === 'cancelled' ? 'cancelled' : ($invoice->status === 'pending_payment' ? 'awaiting_payment' : 'confirmed'),
                    'subtotal'=>$invoice->subtotal,'tax_amount'=>$invoice->tax_amount,'total_amount'=>$invoice->total_amount,
                    'amount_paid'=>max(0, (float) $invoice->total_amount - (float) $invoice->balance),'balance'=>$invoice->balance,
                    'notes'=>$invoice->notes,'metadata'=>['source'=>'invoice_capture'],
                ]);
            }

            $legacyIndex = $this->legacyInvoiceItemIndex($invoiceItems, $legacy, $order);
            foreach ($invoiceItems as $index => $invoiceItem) {
                $isLegacyLine = $legacy['model'] && $legacyIndex === $index;
                $type = $isLegacyLine && $legacy['type']
                    ? $legacy['type']
                    : $this->invoiceItemServiceType($invoiceItem);
                $details = $isLegacyLine ? $legacy['model']->toArray() : $invoiceItem->item_metadata;
                $attributes = [
                    'service_type'=>$type,'service_id'=>$invoiceItem->service_id,
                    'status'=>$invoice->status === 'cancelled' ? 'cancelled' : 'confirmed',
                    'title'=>$invoiceItem->item_name ?? $invoiceItem->service?->name ?? 'Service',
                    'description'=>$invoiceItem->item_description ?? $invoiceItem->service?->description,
                    'quantity'=>$invoiceItem->quantity,'unit_price'=>$invoiceItem->unit_price,
                    'subtotal'=>$invoiceItem->total_price,'tax_amount'=>0,'total_amount'=>$invoiceItem->total_price,
                    'details_snapshot'=>$details,
                ];

                $orderItem = $order->items()->where('line_number', $index + 1)->lockForUpdate()->first();
                if ($orderItem) {
                    $orderItem->update($attributes);
                } else {
                    $orderItem = SalesOrderItem::create([
                        'sales_order_id'=>$order->id,
                        'line_number'=>$index + 1,
                        ...$attributes,
                    ]);
                }

                $orderItem->load('fulfillment');
                if ($isLegacyLine) {
                    $this->associateLegacyFulfillment($order, $orderItem, $legacy['model']);
                    continue;
                }

                $this->captureTypedFulfillment($orderItem, $invoiceItem, $index, $invoice->status === 'cancelled');
                if ($invoice->status !== 'cancelled') {
                    app(TripTicketService::class)->ensureDraftForSalesItem($orderItem, $actorId ?? $invoice->created_by);
                }
            }

            $window = $order->items()->reorder()->selectRaw('MIN(scheduled_start) travel_start, MAX(scheduled_end) travel_end')->first();
            $order->update(['travel_starts_at'=>$window->travel_start, 'travel_ends_at'=>$window->travel_end]);
            if ($created) {
                $this->event($order, 'invoice_captured', null, $order->status, ['invoice_id'=>$invoice->id], $actorId ?? $invoice->created_by);
            }

            return $order->fresh($this->relations());
        });
    }

    private function invoiceItemServiceType(InvoiceItem $invoiceItem): string
    {
        return $invoiceItem->service_type ?? $invoiceItem->service?->service_type ?? 'custom_arrangement';
    }

    /**
     * Whether at least one invoice line carries a service-owned operational payload.
     * Callers use this to capture typed fulfillment before committing the invoice so
     * allocation failures roll back the financial document as one unit.
     */
    public function hasTypedCapturePayload(iterable $items): bool
    {
        return collect($items)->contains(fn ($item) => $this->lineUsesTypedCapture($item));
    }

    /**
     * Legacy Booking is only appropriate when actual top-level booking data exists and
     * at least one line is not already owned by a typed service engine.
     */
    public function shouldCreateLegacyBooking(iterable $items, array $bookingAttributes): bool
    {
        $hasBookingData = collect($bookingAttributes)
            ->except('invoice_id')
            ->contains(fn ($value) => !blank($value));

        if (!$hasBookingData) return false;

        return collect($items)->contains(fn ($item) => !$this->lineUsesTypedCapture($item));
    }

    private function legacyInvoiceItemIndex($invoiceItems, array $legacy, SalesOrder $order): ?int
    {
        /** @var Model|null $model */
        $model = $legacy['model'];
        if (!$model || $invoiceItems->isEmpty()) return null;

        $attached = $order->items()
            ->where('fulfillment_type', $model->getMorphClass())
            ->where('fulfillment_id', $model->getKey())
            ->first();
        if ($attached) {
            $attachedIndex = max(0, (int) $attached->line_number - 1);
            $attachedInvoiceItem = $invoiceItems->get($attachedIndex);
            if ($legacy['type'] || !$attachedInvoiceItem || !$this->lineUsesTypedCapture($attachedInvoiceItem)) {
                return $attachedIndex;
            }
        }

        if ($legacy['type']) {
            foreach ($invoiceItems as $index => $invoiceItem) {
                if ($this->invoiceItemServiceType($invoiceItem) === $legacy['type']) return $index;
            }
        }

        foreach ($invoiceItems as $index => $invoiceItem) {
            if (!$this->lineUsesTypedCapture($invoiceItem)) return $index;
        }

        return null;
    }

    private function associateLegacyFulfillment(SalesOrder $order, SalesOrderItem $item, Model $fulfillment): void
    {
        if ($item->fulfillment) return;
        $alreadyAttached = $order->items()
            ->where('id', '!=', $item->id)
            ->where('fulfillment_type', $fulfillment->getMorphClass())
            ->where('fulfillment_id', $fulfillment->getKey())
            ->exists();
        if ($alreadyAttached) return;

        $item->fulfillment()->associate($fulfillment);
        $item->save();
    }

    private function captureTypedFulfillment(SalesOrderItem $item, InvoiceItem $invoiceItem, int $index, bool $cancelled): void
    {
        if (!in_array($item->service_type, self::TYPED_CAPTURE_TYPES, true)) return;

        $metadata = $invoiceItem->item_metadata;
        // Historical invoice lines have no operational snapshot. They remain visible
        // in the shared order without inventing fulfillment data.
        if ($metadata === null || $metadata === []) return;
        if (!is_array($metadata)) {
            throw ValidationException::withMessages([
                "items.{$index}.item_metadata" => "Invoice line ".($index + 1).' operational metadata must be a structured object.',
            ]);
        }

        // Repair invoices captured by the former generalized path: a generic Booking
        // must never block a service-specific fulfillment from owning its typed line.
        if ($item->fulfillment instanceof Booking) {
            $item->fulfillment()->dissociate();
            $item->save();
            $item->unsetRelation('fulfillment');
        }
        if ($item->fulfillment) return;

        $details = $this->validateCapturedMetadata($item, $invoiceItem, $metadata, $index);
        [$start, $end, $travelers] = $this->scheduleFor($item->service_type, $details);
        $item->update([
            'supplier_cost'=>$details['supplier_cost'] ?? null,
            'scheduled_start'=>$start,
            'scheduled_end'=>$end,
            'traveler_count'=>$travelers,
            'details_snapshot'=>$details,
            'status'=>$cancelled ? 'cancelled' : 'draft',
        ]);

        $fulfillment = $this->fulfillments->create($item, $details);
        $item->fulfillment()->associate($fulfillment);
        $item->save();
        if ($cancelled) {
            $fulfillment->update(['status'=>'cancelled']);
            return;
        }

        $this->reserveAndConfirm($item);
    }

    private function validateCapturedMetadata(SalesOrderItem $item, InvoiceItem $invoiceItem, array $metadata, int $index): array
    {
        try {
            return $this->fulfillments->validate($item->service_type, $metadata, $item->service_id, [
                'adults' => $invoiceItem->adults,
                'children' => $invoiceItem->children,
            ]);
        } catch (ValidationException $exception) {
            $prefixed = [];
            foreach ($exception->errors() as $field => $messages) {
                $key = "items.{$index}.item_metadata".($field !== '' ? ".{$field}" : '');
                $prefixed[$key] = array_map(
                    fn (string $message) => 'Invoice line '.($index + 1)." ({$item->title}): {$message}",
                    $messages
                );
            }

            throw ValidationException::withMessages($prefixed);
        }
    }

    public function syncInvoiceFinancials(Invoice $invoice): void
    {
        $order = SalesOrder::where('invoice_id', $invoice->id)->first();
        if (!$order) return;
        $status = match ($invoice->status) {
            'cancelled' => 'cancelled', 'paid', 'partial' => 'confirmed', default => 'awaiting_payment',
        };
        $order->update([
            'status'=>$status,'amount_paid'=>max(0, (float) $invoice->total_amount - (float) $invoice->balance),
            'balance'=>$invoice->balance,
        ]);
    }

    public function resynchronizeFulfillment(SalesOrderItem $item): void
    {
        $item->refresh()->load(['fulfillment','order']);
        [$start,$end,$travelers] = $this->scheduleFor($item->service_type, $item->fulfillment->toArray());
        $item->update(['scheduled_start'=>$start,'scheduled_end'=>$end,'traveler_count'=>$travelers,'details_snapshot'=>$item->fulfillment->toArray()]);
        $this->reserveAndConfirm($item);
        $this->recalculate($item->order);
    }

    private function reserveAndConfirm(SalesOrderItem $item): void
    {
        $fulfillment = $item->fulfillment;
        if (in_array($item->service_type, ['private_tour','transfer_service'], true)) {
            $busId = $fulfillment->bus_id;
            $driverId = $fulfillment->driver_id;
            if ($busId) {
                $bus = Bus::lockForUpdate()->findOrFail($busId);
                if ($bus->status !== 'available') throw ValidationException::withMessages(["items.{$item->line_number}.bus_id" => 'Vehicle is not operationally available.']);
                if ($fulfillment->passenger_count > $bus->seating_capacity) throw ValidationException::withMessages(["items.{$item->line_number}.passenger_count" => 'Passenger count exceeds vehicle capacity.']);
            }
            if ($driverId) {
                $driver = User::lockForUpdate()->findOrFail($driverId);
                if ($driver->role !== 'driver' || !$driver->is_active) throw ValidationException::withMessages(["items.{$item->line_number}.driver_id" => 'Driver is not active.']);
            }
            if ($busId || $driverId) {
                $start = $item->service_type === 'private_tour' ? $fulfillment->starts_at : $fulfillment->pickup_at;
                $end = $item->service_type === 'private_tour' ? $fulfillment->ends_at : ($fulfillment->dropoff_at ?? Carbon::parse($start)->addHours(4));
                app(ResourceAllocationService::class)->reserve($fulfillment, $busId, $driverId, $start, $end, $item->order->order_number);
            }
        }
        if ($item->service_type === 'activity_booking') {
            $booked = ActivityBooking::whereHas('orderItem', fn ($q) => $q->where('service_id', $item->service_id)->where('id', '!=', $item->id))
                ->where('session_starts_at', $fulfillment->session_starts_at)->whereNotIn('status', ['cancelled'])->sum('participant_count');
            if ($booked + $fulfillment->participant_count > $fulfillment->capacity) {
                throw ValidationException::withMessages(["items.{$item->line_number}.participant_count" => 'This activity session no longer has enough capacity.']);
            }
        }
        $fulfillment->update(['status'=>'confirmed']);
        $item->update(['status'=>'confirmed']);
    }

    public function recalculate(SalesOrder $order): void
    {
        $totals = $order->items()->reorder()->selectRaw('COALESCE(SUM(subtotal),0) subtotal, COALESCE(SUM(tax_amount),0) tax_amount, COALESCE(SUM(total_amount),0) total_amount, MIN(scheduled_start) travel_start, MAX(scheduled_end) travel_end')->first();
        $order->update([
            'subtotal'=>$totals->subtotal,'tax_amount'=>$totals->tax_amount,'total_amount'=>$totals->total_amount,
            'balance'=>max(0, (float) $totals->total_amount - (float) $order->amount_paid),
            'travel_starts_at'=>$totals->travel_start,'travel_ends_at'=>$totals->travel_end,
        ]);
    }

    private function scheduleFor(string $type, array $details): array
    {
        return match ($type) {
            'private_tour' => [$details['starts_at'],$details['ends_at'],$details['passenger_count']],
            'visa_assistance' => [$details['appointment_at'] ?? $details['intended_departure'] ?? null,null,1],
            'passport_assistance' => [$details['appointment_at'] ?? null,$details['target_release_date'] ?? null,1],
            'flight_booking' => [$details['departure_at'],$details['return_at'] ?? null,$details['passenger_count']],
            'accommodation_booking' => [$details['check_in'],$details['check_out'],$details['adult_count'] + ($details['child_count'] ?? 0)],
            'ticket_booking' => [$details['departure_at'],$details['arrival_at'] ?? null,$details['passenger_count']],
            'activity_booking' => [$details['session_starts_at'],$details['session_ends_at'] ?? null,$details['participant_count']],
            'transfer_service' => [$details['pickup_at'],$details['dropoff_at'] ?? null,$details['passenger_count']],
            'custom_arrangement' => [$details['target_starts_at'] ?? null,$details['target_ends_at'] ?? null,null],
        };
    }

    private function invoiceFulfillment(Invoice $invoice): array
    {
        foreach ([['joinerReservation','joiner_tour'],['charterBooking','bus_rental'],['educationalTourBooking','educational_tour'],['booking',null]] as [$relation,$type]) {
            if ($invoice->{$relation}) return ['type'=>$type,'model'=>$invoice->{$relation}];
        }
        return ['type'=>null,'model'=>null];
    }

    private function lineUsesTypedCapture(mixed $item): bool
    {
        $type = data_get($item, 'service_type');
        if (!$type && $item instanceof InvoiceItem) {
            $type = $this->invoiceItemServiceType($item);
        }

        $metadata = data_get($item, 'item_metadata');

        return in_array($type, self::TYPED_CAPTURE_TYPES, true)
            && $metadata !== null
            && $metadata !== [];
    }

    private function assertEditable(SalesOrder $order): void
    {
        if (!in_array($order->status, ['draft','quoted'], true) || $order->invoice_id) {
            throw ValidationException::withMessages(['order' => 'Only unconfirmed draft or quoted orders can be edited.']);
        }
    }

    private function renumber(SalesOrder $order): void
    {
        foreach ($order->items()->orderBy('line_number')->get() as $index => $item) $item->update(['line_number'=>$index + 1]);
    }

    private function event(SalesOrder $order, string $type, ?string $from, ?string $to, array $payload, ?int $actorId, ?SalesOrderItem $item = null): void
    {
        SalesOrderEvent::create(['sales_order_id'=>$order->id,'sales_order_item_id'=>$item?->id,'event_type'=>$type,'from_status'=>$from,'to_status'=>$to,'payload'=>$payload ?: null,'actor_id'=>$actorId,'occurred_at'=>now()]);
    }

    private function number(string $prefix): string
    {
        // Generate a date-contextual sequential reference e.g. ORD-072726-001
        return SalesReferenceService::generate($prefix, null, now());
    }

    public function relations(): array
    {
        return ['customer','agent:id,first_name,last_name,email','invoice','items.service','items.fulfillment','events','adjustments','creditNotes','refunds'];
    }
}
