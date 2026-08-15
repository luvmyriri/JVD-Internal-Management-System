<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use App\Models\SalesOrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection as SupportCollection;

class TransactionSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Invoice $invoice */
        $invoice = $this->resource;
        $order = $invoice->relationLoaded('salesOrder') ? $invoice->salesOrder : null;
        $collection = $invoice->relationLoaded('collection') ? $invoice->collection : null;
        $contract = $invoice->relationLoaded('contract') ? $invoice->contract : null;
        $bookingContexts = $this->bookingContexts($invoice);
        $booking = $bookingContexts->first();
        $items = $invoice->relationLoaded('items') ? $invoice->items : collect();
        $orderItems = $order && $order->relationLoaded('items') ? $order->items : collect();
        $productItems = $items->isNotEmpty()
            ? $items->map(fn ($item) => [
                'id' => $item->id,
                'service_id' => $item->service_id,
                'name' => $item->item_name ?? $item->service?->name ?? 'Service',
                'service_type' => $item->service_type ?? $item->service?->service_type,
                'quantity' => (float) $item->quantity,
                'total_amount' => (float) $item->total_price,
            ])
            : $orderItems->map(fn ($item) => [
                'id' => $item->id,
                'service_id' => $item->service_id,
                'name' => $item->title,
                'service_type' => $item->service_type,
                'quantity' => (float) ($item->quantity ?? 1),
                'total_amount' => (float) ($item->total_amount ?? 0),
            ]);
        $serviceTypes = $items->map(fn ($item) => $item->service_type ?? $item->service?->service_type)
            ->merge($orderItems->pluck('service_type'))
            ->filter()->unique()->values();
        $paymentMethods = $this->payments($invoice)->pluck('payment_method')
            ->push($invoice->payment_method)->filter()->unique()->values();
        $grossCollected = round((float) ($invoice->getAttribute('effective_collected') ?? 0), 2);
        $credited = round((float) ($invoice->credited_amount ?? 0), 2);
        $refunded = round((float) ($invoice->refunded_amount ?? 0), 2);
        $total = round((float) $invoice->total_amount, 2);
        $balance = max(0, round($total - $grossCollected - $credited, 2));
        $paymentState = $this->paymentState($invoice, $grossCollected, $total, $credited, $refunded);
        $refunds = $order && $order->relationLoaded('refunds') ? $order->refunds : collect();
        $documents = $this->documents($order?->id, $contract?->id, $serviceTypes);

        return [
            'id' => $invoice->id,
            'transaction_number' => $order?->order_number ?? $invoice->invoice_number,
            'kind' => $this->kind($invoice),
            'payment_state' => $paymentState,
            'identifiers' => [
                'transaction_id' => $order?->order_number ?? $invoice->invoice_number,
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'sales_order_id' => $order?->id,
                'order_number' => $order?->order_number,
                'collection_id' => $collection?->id,
                'customer_id' => $invoice->customer_id,
                'booking_type' => $booking['type'] ?? null,
                'booking_id' => $booking['id'] ?? null,
                'booking_reference' => $booking['reference'] ?? null,
            ],
            'invoice' => [
                'id' => $invoice->id,
                'number' => $invoice->invoice_number,
                'status' => $invoice->status,
            ],
            'order' => $order ? [
                'id' => $order->id,
                'number' => $order->order_number,
                'status' => $order->status,
            ] : null,
            'customer' => [
                'id' => $invoice->customer_id,
                'name' => $invoice->customer_name ?: $this->customerName($invoice),
                'email' => $invoice->customer_email ?: $invoice->customer?->email,
                'contact' => $invoice->customer_contact ?: $invoice->customer?->phone,
            ],
            'product' => [
                'primary_name' => $productItems->first()['name'] ?? 'Unclassified service',
                'item_count' => $productItems->count(),
                'service_types' => $serviceTypes,
                'items' => $productItems->values(),
            ],
            'booking' => $booking,
            'money' => [
                'currency' => $order?->currency ?? 'PHP',
                'subtotal' => (float) $invoice->subtotal,
                'tax' => (float) $invoice->tax_amount,
                'total' => $total,
                'gross_collected' => $grossCollected,
                'net_collected' => max(0, round($grossCollected - $refunded, 2)),
                'credited' => $credited,
                'refunded' => $refunded,
                'balance' => $balance,
                'payment_state' => $paymentState,
                'payment_type' => $invoice->payment_type,
                'payment_methods' => $paymentMethods,
                'due_date' => $invoice->due_date,
                'evidence_source' => (int) ($invoice->getAttribute('posted_payment_count') ?? 0) > 0
                    ? 'posted_payments'
                    : ($grossCollected > 0 ? 'legacy_invoice_balance' : 'none'),
            ],
            'collection' => $collection ? [
                'id' => $collection->id,
                'status' => $collection->collection_status,
                'is_overdue' => $collection->collection_status === 'overdue'
                    || ($balance > 0 && $invoice->due_date && now()->startOfDay()->gt(Carbon::parse($invoice->due_date))),
            ] : null,
            'contract' => [
                'required' => (bool) $invoice->requires_contract,
                'gate_status' => $invoice->contract_gate_status,
                'id' => $contract?->id,
                'number' => $contract?->contract_number,
                'status' => $contract?->isExpired() ? 'expired' : $contract?->status,
            ],
            'schedule' => $this->schedule($invoice, $order, $booking),
            'refund' => [
                'count' => $refunds->count(),
                'latest_status' => $refunds->sortByDesc('created_at')->first()?->status,
                'available_amount' => max(0, round(min($total, $grossCollected) - $refunded, 2)),
            ],
            'documents' => $documents,
            'navigation' => $this->navigation($invoice, $order?->id, $collection?->id, $booking, $documents),
            'created_at' => $invoice->created_at?->toISOString(),
            'updated_at' => $invoice->updated_at?->toISOString(),
        ];
    }

    protected function bookingContexts(Invoice $invoice): SupportCollection
    {
        $contexts = collect();
        $joiner = $invoice->relationLoaded('joinerReservation') ? $invoice->joinerReservation : null;
        if ($joiner) {
            $departure = $joiner->relationLoaded('departure') ? $joiner->departure : null;
            $contexts->push([
                'type' => 'joiner_tour',
                'id' => $joiner->id,
                'reference' => $joiner->reference,
                'status' => $joiner->status,
                'parent_id' => $departure?->id,
                'parent_reference' => $departure?->code,
                'product_id' => $departure?->service_id,
                'context' => [
                    'departure_id' => $departure?->id,
                    'departure_code' => $departure?->code,
                    'departure_status' => $departure?->status,
                ],
            ]);
        }

        $charter = $invoice->relationLoaded('charterBooking') ? $invoice->charterBooking : null;
        if ($charter) {
            $plan = $charter->relationLoaded('ratePlan') ? $charter->ratePlan : null;
            $contexts->push([
                'type' => 'bus_rental',
                'id' => $charter->id,
                'reference' => $charter->reference,
                'status' => $charter->status,
                'parent_id' => $plan?->id,
                'parent_reference' => $plan?->name,
                'product_id' => $plan?->service_id,
                'context' => [
                    'rate_plan_id' => $plan?->id,
                    'rate_plan_name' => $plan?->name,
                ],
            ]);
        }

        $education = $invoice->relationLoaded('educationalTourBooking') ? $invoice->educationalTourBooking : null;
        if ($education) {
            $program = $education->relationLoaded('program') ? $education->program : null;
            $contexts->push([
                'type' => 'educational_tour',
                'id' => $education->id,
                'reference' => $education->reference,
                'status' => $education->status,
                'parent_id' => $program?->id,
                'parent_reference' => $program?->name,
                'product_id' => $program?->service_id,
                'context' => [
                    'program_id' => $program?->id,
                    'program_name' => $program?->name,
                    'school_name' => $education->school_name,
                ],
            ]);
        }

        $order = $invoice->relationLoaded('salesOrder') ? $invoice->salesOrder : null;
        if ($order && $order->relationLoaded('items')) {
            $order->items->where('service_type', 'private_tour')->each(function (SalesOrderItem $item) use ($contexts): void {
                $contexts->push([
                    'type' => 'private_tour',
                    'id' => $item->fulfillment_id,
                    'reference' => $item->title,
                    'status' => $item->status,
                    'parent_id' => $item->id,
                    'parent_reference' => $item->title,
                    'product_id' => $item->service_id,
                    'context' => [
                        'sales_order_item_id' => $item->id,
                        'title' => $item->title,
                    ],
                ]);
            });
        }

        if ($contexts->isEmpty()) {
            $legacy = $invoice->relationLoaded('booking') ? $invoice->booking : null;
            if ($legacy) {
                $contexts->push([
                    'type' => 'private_tour',
                    'id' => $legacy->id,
                    'reference' => $legacy->tour_code ?: $invoice->invoice_number,
                    'status' => $invoice->status,
                    'parent_id' => null,
                    'parent_reference' => null,
                    'product_id' => $invoice->items?->first()?->service_id,
                    'context' => [
                        'legacy_booking' => true,
                        'tour_code' => $legacy->tour_code,
                    ],
                ]);
            }
        }

        return $contexts->values();
    }

    protected function payments(Invoice $invoice): SupportCollection
    {
        $collection = $invoice->relationLoaded('collection') ? $invoice->collection : null;

        return $collection && $collection->relationLoaded('payments')
            ? $collection->payments
            : collect();
    }

    protected function kind(Invoice $invoice): string
    {
        return $invoice->cash_budget_request_id || $invoice->status === 'disbursed_budget'
            ? 'cash_budget_disbursement'
            : 'sales';
    }

    protected function paymentState(
        Invoice $invoice,
        float $grossCollected,
        float $total,
        float $credited,
        float $refunded
    ): string {
        if ($refunded > 0) {
            return 'refunded';
        }
        if ($total > 0 && $grossCollected >= $total) {
            return 'paid';
        }
        $outstanding = max(0, round($total - $grossCollected - $credited, 2));
        if ($outstanding > 0 && $invoice->due_date && now()->startOfDay()->gt(Carbon::parse($invoice->due_date))) {
            return 'overdue';
        }

        return $grossCollected > 0 ? 'partial' : 'unpaid';
    }

    protected function schedule(Invoice $invoice, $order, ?array $booking): array
    {
        $startsAt = $order?->travel_starts_at;
        $endsAt = $order?->travel_ends_at;
        $travelerCount = null;
        $travelDate = null;

        $joiner = $invoice->relationLoaded('joinerReservation') ? $invoice->joinerReservation : null;
        if ($joiner) {
            $startsAt = $joiner->departure?->starts_at ?? $startsAt;
            $endsAt = $joiner->departure?->ends_at ?? $endsAt;
            $travelerCount = (int) $joiner->passenger_count;
        }
        $charter = $invoice->relationLoaded('charterBooking') ? $invoice->charterBooking : null;
        if ($charter) {
            $startsAt = $charter->starts_at ?? $startsAt;
            $endsAt = $charter->ends_at ?? $endsAt;
            $travelerCount = (int) $charter->passenger_count;
        }
        $education = $invoice->relationLoaded('educationalTourBooking') ? $invoice->educationalTourBooking : null;
        if ($education) {
            $startsAt = $education->starts_at ?? $startsAt;
            $endsAt = $education->ends_at ?? $endsAt;
            $travelerCount = (int) $education->student_count + (int) $education->chaperone_count;
        }
        $legacy = $invoice->relationLoaded('booking') ? $invoice->booking : null;
        if ($legacy && ! $joiner && ! $charter && ! $education) {
            $travelDate = $legacy->travel_date?->toDateString() ?? (string) $legacy->travel_date;
            $travelerCount = (int) ($legacy->pax_count ?? 0);
        }
        if ($travelerCount === null && $order && $order->relationLoaded('items')) {
            $travelerCount = (int) $order->items->max('traveler_count');
        }
        if ($travelerCount === null) {
            $travelerCount = (int) ($invoice->getAttribute('passengers_count') ?? 0);
        }
        if (! $travelDate && $startsAt) {
            $travelDate = $startsAt->toDateString();
        }
        $travelDate ??= $invoice->due_date;

        return [
            'starts_at' => $startsAt?->toISOString(),
            'ends_at' => $endsAt?->toISOString(),
            'travel_date' => $travelDate,
            'traveler_count' => $travelerCount,
        ];
    }

    protected function documents(?int $orderId, ?int $contractId, SupportCollection $serviceTypes): array
    {
        $hasOrder = $orderId !== null;

        return [
            'invoice' => $hasOrder,
            'quotation' => $hasOrder,
            'manifest' => $hasOrder,
            'contract' => $hasOrder && $contractId !== null,
            'joiner_manifest' => $hasOrder && $serviceTypes->contains('joiner_tour'),
            'charter_confirmation' => $hasOrder && $serviceTypes->contains('bus_rental'),
            'charter_dispatch' => $hasOrder && $serviceTypes->contains('bus_rental'),
            'educational_manifest' => $hasOrder && $serviceTypes->contains('educational_tour'),
        ];
    }

    protected function navigation(Invoice $invoice, ?int $orderId, ?int $collectionId, ?array $booking, array $documents): array
    {
        $route = fn (string $name, string $path, array $params): array => [
            'route' => $name,
            'path' => $path,
            'params' => $params,
        ];
        $engine = match ($booking['type'] ?? null) {
            'joiner_tour' => $booking['parent_id'] ? $route(
                'sales.joiner_departures.show',
                "/sales/departures/{$booking['parent_id']}",
                ['departure_id' => $booking['parent_id']]
            ) : null,
            'bus_rental' => $route(
                'sales.charters.index',
                "/sales/charters?manage_id={$booking['id']}",
                ['booking_id' => $booking['id']]
            ),
            'educational_tour' => $route(
                'sales.educational_tours.index',
                "/sales/educational-tours?manage_id={$booking['id']}",
                ['booking_id' => $booking['id'], 'program_id' => $booking['parent_id']]
            ),
            'private_tour' => $booking['product_id'] ? $route(
                'sales.services.show',
                "/sales/services/{$booking['product_id']}/details",
                ['service_id' => $booking['product_id']]
            ) : null,
            default => null,
        };

        return [
            'transaction' => $route(
                'accounting.transactions.show',
                "/accounting/transactions/{$invoice->id}",
                ['invoice_id' => $invoice->id]
            ),
            'billing' => $route(
                'accounting.transactions.show',
                "/accounting/transactions/{$invoice->id}",
                ['invoice_id' => $invoice->id]
            ),
            'collection' => $collectionId ? $route(
                'accounting.collections.index',
                "/accounting/collections?collection_id={$collectionId}",
                ['collection_id' => $collectionId]
            ) : null,
            'customer' => $invoice->customer_id ? $route(
                'operations.customers.show',
                "/operations/customers/{$invoice->customer_id}",
                ['customer_id' => $invoice->customer_id]
            ) : null,
            'engine' => $engine,
            'product' => ($booking['type'] ?? null) === 'educational_tour' && $booking['parent_id']
                ? $route(
                    'sales.educational_programs.show',
                    "/sales/educational-programs/{$booking['parent_id']}/details",
                    ['program_id' => $booking['parent_id']]
                )
                : null,
            'documents' => $orderId ? [
                'route' => 'sales.orders.documents',
                'path_template' => "/api/v1/sales/orders/{$orderId}/documents/{document}",
                'params' => ['order_id' => $orderId],
                'available' => array_keys(array_filter($documents)),
            ] : null,
        ];
    }

    protected function customerName(Invoice $invoice): string
    {
        return trim(implode(' ', array_filter([
            $invoice->customer?->first_name,
            $invoice->customer?->middle_name,
            $invoice->customer?->last_name,
        ]))) ?: 'Walk-in customer';
    }
}
