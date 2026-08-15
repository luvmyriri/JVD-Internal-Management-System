<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\PrivateTourBooking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\DB;

class TransactionQueryService
{
    public function paginate(array $filters): array
    {
        $query = $this->query($filters);
        $stats = $this->stats(clone $query);
        $paginator = $query
            ->select('invoices.*')
            ->selectRaw('COALESCE(posted_payment_totals.posted_total, 0) AS posted_payment_total')
            ->selectRaw('COALESCE(posted_payment_totals.payment_count, 0) AS posted_payment_count')
            ->selectRaw($this->effectiveCollectedSql().' AS effective_collected')
            ->with($this->summaryRelations())
            ->withCount('passengers')
            ->orderByDesc('invoices.created_at')
            ->orderByDesc('invoices.id')
            ->paginate((int) $filters['per_page']);

        return compact('paginator', 'stats');
    }

    public function find(Invoice $invoice, array $filters): Invoice
    {
        return $this->query($filters)
            ->where('invoices.id', $invoice->getKey())
            ->select('invoices.*')
            ->selectRaw('COALESCE(posted_payment_totals.posted_total, 0) AS posted_payment_total')
            ->selectRaw('COALESCE(posted_payment_totals.payment_count, 0) AS posted_payment_count')
            ->selectRaw($this->effectiveCollectedSql().' AS effective_collected')
            ->with($this->detailRelations())
            ->withCount('passengers')
            ->firstOrFail();
    }

    private function query(array $filters): Builder
    {
        $payments = DB::table('collection_payments')
            ->join('collections', 'collections.id', '=', 'collection_payments.collection_id')
            ->whereNull('collections.deleted_at')
            ->whereNotNull('collections.invoice_id')
            ->groupBy('collections.invoice_id')
            ->selectRaw('collections.invoice_id, SUM(collection_payments.amount) AS posted_total, COUNT(collection_payments.id) AS payment_count');

        $query = Invoice::query()
            ->whereNull('invoices.deleted_at')
            ->leftJoinSub($payments, 'posted_payment_totals', function ($join): void {
                $join->on('posted_payment_totals.invoice_id', '=', 'invoices.id');
            });

        $this->applyKind($query, $filters['kind']);
        $this->applyFilters($query, $filters);

        return $query;
    }

    private function applyKind(Builder $query, string $kind): void
    {
        if ($kind === 'sales') {
            $query->whereNull('invoices.cash_budget_request_id')
                ->where('invoices.status', '!=', 'disbursed_budget');
        } elseif ($kind === 'cash_budget_disbursement') {
            $query->where(function (Builder $kindQuery): void {
                $kindQuery->whereNotNull('invoices.cash_budget_request_id')
                    ->orWhere('invoices.status', 'disbursed_budget');
            });
        }
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['search'])) {
            $needle = '%'.mb_strtolower(trim($filters['search'])).'%';
            $query->where(function (Builder $search) use ($needle): void {
                $search->whereRaw('LOWER(invoices.invoice_number) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(COALESCE(invoices.customer_name, ?)) LIKE ?', ['', $needle])
                    ->orWhereRaw('LOWER(COALESCE(invoices.payment_id, ?)) LIKE ?', ['', $needle])
                    ->orWhereHas('salesOrder', fn (Builder $order) => $order
                        ->whereRaw('LOWER(sales_orders.order_number) LIKE ?', [$needle]))
                    ->orWhereHas('customer', function (Builder $customer) use ($needle): void {
                        $customer->whereRaw("LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ?", [$needle])
                            ->orWhereRaw('LOWER(COALESCE(email, ?)) LIKE ?', ['', $needle]);
                    })
                    ->orWhereHas('items', function (Builder $items) use ($needle): void {
                        $items->whereRaw('LOWER(COALESCE(item_name, ?)) LIKE ?', ['', $needle])
                            ->orWhereHas('service', fn (Builder $service) => $service
                                ->whereRaw('LOWER(services.name) LIKE ?', [$needle]));
                    })
                    ->orWhereHas('salesOrder.items', function (Builder $items) use ($needle): void {
                        $items->whereRaw('LOWER(COALESCE(title, ?)) LIKE ?', ['', $needle])
                            ->orWhereHas('service', fn (Builder $service) => $service
                                ->whereRaw('LOWER(services.name) LIKE ?', [$needle]));
                    })
                    ->orWhereHas('collection.payments', fn (Builder $payment) => $payment
                        ->whereRaw('LOWER(COALESCE(paymongo_payment_id, ?)) LIKE ?', ['', $needle]))
                    ->orWhereHas('joinerReservation', fn (Builder $booking) => $booking
                        ->whereRaw('LOWER(joiner_reservations.reference) LIKE ?', [$needle]))
                    ->orWhereHas('charterBooking', fn (Builder $booking) => $booking
                        ->whereRaw('LOWER(charter_bookings.reference) LIKE ?', [$needle]))
                    ->orWhereHas('educationalTourBooking', function (Builder $booking) use ($needle): void {
                        $booking->whereRaw('LOWER(educational_tour_bookings.reference) LIKE ?', [$needle])
                            ->orWhereRaw('LOWER(educational_tour_bookings.school_name) LIKE ?', [$needle]);
                    });
            });
        }

        foreach (['status', 'payment_type'] as $field) {
            if (! empty($filters[$field])) {
                $query->where("invoices.{$field}", $filters[$field]);
            }
        }

        if (! empty($filters['payment_method'])) {
            $method = $filters['payment_method'];
            $query->where(function (Builder $methods) use ($method): void {
                $methods->where('invoices.payment_method', $method)
                    ->orWhereHas('collection.payments', fn (Builder $payments) => $payments
                        ->where('payment_method', $method));
            });
        }

        if (! empty($filters['service_type'])) {
            $serviceType = $filters['service_type'];
            $query->where(function (Builder $types) use ($serviceType): void {
                $types->whereHas('items', fn (Builder $items) => $items
                    ->where('service_type', $serviceType)
                    ->orWhereHas('service', fn (Builder $service) => $service->where('service_type', $serviceType)))
                    ->orWhereHas('salesOrder.items', fn (Builder $items) => $items->where('service_type', $serviceType));
            });
        }

        if (! empty($filters['collection_status'])) {
            $status = $filters['collection_status'];
            $query->whereHas('collection', fn (Builder $collection) => $collection
                ->where('collection_status', $status));
        }

        if (! empty($filters['contract_status'])) {
            $this->applyContractStatus($query, $filters['contract_status']);
        }

        if (! empty($filters['payment_state'])) {
            $this->applyPaymentState($query, $filters['payment_state']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('invoices.created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('invoices.created_at', '<=', $filters['date_to']);
        }
    }

    private function applyContractStatus(Builder $query, string $status): void
    {
        match ($status) {
            'not_required' => $query->where('invoices.requires_contract', false),
            'required' => $query->where('invoices.requires_contract', true),
            'expired' => $query->whereHas('contract', fn (Builder $contract) => $contract
                ->where('status', 'sent_for_signature')->where('expires_at', '<', now())),
            default => $query->whereHas('contract', fn (Builder $contract) => $contract->where('status', $status)),
        };
    }

    private function applyPaymentState(Builder $query, string $state): void
    {
        $posted = $this->effectiveCollectedSql();
        $total = 'COALESCE(invoices.total_amount, 0)';
        $refunded = 'COALESCE(invoices.refunded_amount, 0)';
        $outstanding = "({$total}) - ({$posted}) - COALESCE(invoices.credited_amount, 0)";

        if ($state === 'refunded') {
            $query->whereRaw("{$refunded} > 0");

            return;
        }

        $query->whereRaw("{$refunded} <= 0");
        if ($state === 'paid') {
            $query->whereRaw("{$posted} >= {$total}");
        } elseif ($state === 'overdue') {
            $query->whereRaw("{$outstanding} > 0")
                ->whereNotNull('invoices.due_date')
                ->whereDate('invoices.due_date', '<', now()->toDateString());
        } elseif ($state === 'partial') {
            $query->whereRaw("{$posted} > 0 AND {$posted} < {$total}")
                ->where(function (Builder $due) use ($outstanding): void {
                    $due->whereRaw("{$outstanding} <= 0")
                        ->orWhereNull('invoices.due_date')
                        ->orWhereDate('invoices.due_date', '>=', now()->toDateString());
                });
        } else {
            $query->whereRaw("{$posted} <= 0 AND {$total} > 0")
                ->where(function (Builder $due) use ($outstanding): void {
                    $due->whereRaw("{$outstanding} <= 0")
                        ->orWhereNull('invoices.due_date')
                        ->orWhereDate('invoices.due_date', '>=', now()->toDateString());
                });
        }
    }

    private function stats(Builder $query): array
    {
        $collected = $this->effectiveCollectedSql();
        $netCollected = "CASE WHEN ({$collected}) - COALESCE(invoices.refunded_amount, 0) > 0 THEN ({$collected}) - COALESCE(invoices.refunded_amount, 0) ELSE 0 END";
        $outstanding = "CASE WHEN COALESCE(invoices.total_amount, 0) - ({$collected}) - COALESCE(invoices.credited_amount, 0) > 0 THEN COALESCE(invoices.total_amount, 0) - ({$collected}) - COALESCE(invoices.credited_amount, 0) ELSE 0 END";
        $row = (clone $query)->reorder()->selectRaw(<<<SQL
            COUNT(invoices.id) AS transaction_count,
            COALESCE(SUM(invoices.total_amount), 0) AS total_billed,
            COALESCE(SUM({$collected}), 0) AS gross_collected,
            COALESCE(SUM({$netCollected}), 0) AS net_collected,
            COALESCE(SUM({$outstanding}), 0) AS outstanding,
            COALESCE(SUM(COALESCE(invoices.credited_amount, 0)), 0) AS credited,
            COALESCE(SUM(COALESCE(invoices.refunded_amount, 0)), 0) AS refunded
        SQL)->first();

        $statusCounts = (clone $query)
            ->reorder()
            ->select('invoices.status')
            ->selectRaw('COUNT(invoices.id) AS aggregate')
            ->groupBy('invoices.status')
            ->pluck('aggregate', 'invoices.status')
            ->map(fn ($count) => (int) $count)
            ->all();

        return [
            'transaction_count' => (int) ($row->transaction_count ?? 0),
            'total_billed' => (float) ($row->total_billed ?? 0),
            'gross_collected' => (float) ($row->gross_collected ?? 0),
            'net_collected' => (float) ($row->net_collected ?? 0),
            'outstanding' => (float) ($row->outstanding ?? 0),
            'credited' => (float) ($row->credited ?? 0),
            'refunded' => (float) ($row->refunded ?? 0),
            'status_counts' => $statusCounts,
        ];
    }

    private function effectiveCollectedSql(): string
    {
        return <<<'SQL'
            CASE
                WHEN COALESCE(posted_payment_totals.payment_count, 0) > 0
                    THEN COALESCE(posted_payment_totals.posted_total, 0)
                WHEN COALESCE(invoices.amount_received, 0) - COALESCE(invoices.change, 0) > 0
                    THEN CASE
                        WHEN COALESCE(invoices.total_amount, 0) - COALESCE(invoices.credited_amount, 0) <= 0
                            THEN 0
                        WHEN COALESCE(invoices.amount_received, 0) - COALESCE(invoices.change, 0)
                            < COALESCE(invoices.total_amount, 0) - COALESCE(invoices.credited_amount, 0)
                            THEN COALESCE(invoices.amount_received, 0) - COALESCE(invoices.change, 0)
                        ELSE COALESCE(invoices.total_amount, 0) - COALESCE(invoices.credited_amount, 0)
                    END
                WHEN invoices.status = 'paid'
                    THEN CASE
                        WHEN COALESCE(invoices.total_amount, 0) - COALESCE(invoices.credited_amount, 0) > 0
                            THEN COALESCE(invoices.total_amount, 0) - COALESCE(invoices.credited_amount, 0)
                        ELSE 0
                    END
                WHEN invoices.status = 'partial'
                    AND COALESCE(invoices.total_amount, 0) - COALESCE(invoices.balance, 0) - COALESCE(invoices.credited_amount, 0) > 0
                    THEN COALESCE(invoices.total_amount, 0) - COALESCE(invoices.balance, 0) - COALESCE(invoices.credited_amount, 0)
                ELSE 0
            END
        SQL;
    }

    private function summaryRelations(): array
    {
        return [
            'customer:id,first_name,middle_name,last_name,email,phone',
            'items:id,invoice_id,service_id,item_name,service_type,quantity,total_price',
            'items.service:id,name,category,service_type',
            'collection:id,invoice_id,collection_status,due_date,remaining_balance',
            'collection.payments:id,collection_id,payment_date,payment_method,amount,balance,created_at',
            'contract:id,invoice_id,contract_number,status,expires_at',
            'salesOrder:id,invoice_id,order_number,status,currency,travel_starts_at,travel_ends_at',
            'salesOrder.items:id,sales_order_id,line_number,service_id,service_type,fulfillment_type,fulfillment_id,status,title,scheduled_start,scheduled_end,traveler_count',
            'salesOrder.creditNotes:id,sales_order_id,invoice_id,credit_note_number,status,total_amount,posted_at',
            'salesOrder.refunds:id,sales_order_id,invoice_id,credit_note_id,refund_number,status,amount,refund_method,created_at',
            'booking:id,invoice_id,travel_date,pax_count,tour_code,pickup_location,departure_datetime,arrival_datetime',
            'joinerReservation:id,invoice_id,departure_id,reference,passenger_count,status',
            'joinerReservation.departure:id,service_id,code,starts_at,ends_at,pickup_instructions,status',
            'joinerReservation.departure.service:id,name,service_type',
            'charterBooking:id,invoice_id,rate_plan_id,reference,starts_at,ends_at,passenger_count,status',
            'charterBooking.ratePlan:id,service_id,name',
            'charterBooking.ratePlan.service:id,name,service_type',
            'educationalTourBooking:id,invoice_id,program_id,reference,school_name,starts_at,ends_at,student_count,chaperone_count,status',
            'educationalTourBooking.program:id,service_id,name',
        ];
    }

    private function detailRelations(): array
    {
        $summary = array_values(array_filter(
            $this->summaryRelations(),
            fn ($relation) => ! is_string($relation)
                || (! str_starts_with($relation, 'items:')
                    && ! str_starts_with($relation, 'collection.payments:')
                    && ! str_starts_with($relation, 'salesOrder.items:')
                    && ! str_starts_with($relation, 'salesOrder.creditNotes:')
                    && ! str_starts_with($relation, 'salesOrder.refunds:')
                    && ! str_starts_with($relation, 'booking:')
                    && ! str_starts_with($relation, 'charterBooking:')
                    && ! str_starts_with($relation, 'educationalTourBooking:'))
        ));

        return [
            ...$summary,
            'creator:id,first_name,last_name,email',
            'items:id,invoice_id,service_id,item_name,service_type,item_description,item_metadata,quantity,unit_price,total_price,adults,children,adult_price,child_price',
            'collection.payments:id,collection_id,payment_date,payment_method,amount,balance,paymongo_payment_id,created_at',
            'paymentSchedules:id,invoice_id,installment_number,due_date,amount_due,status,notes',
            'passengers:id,invoice_id,first_name,last_name,date_of_birth,passport_number,dietary_restrictions,emergency_contact,special_needs',
            'itineraries:id,invoice_id,day_number,date,location,activity_description,meal_plan,accommodation_name',
            'tripTickets:id,invoice_id,sales_order_item_id,control_no,assignment_index,status,date_of_travel,duration,pick_up,drop_off,no_of_passengers,bus_id,driver_id',
            'tripTickets.bus:id,plate_number,model,seating_capacity',
            'tripTickets.driver:id,first_name,last_name,phone,email',
            'joinerReservation.passengers:id,reservation_id,departure_seat_id,first_name,last_name,passenger_type,date_of_birth,emergency_contact,special_needs',
            'joinerReservation.passengers.seat:id,seat_code',
            'booking:id,invoice_id,travel_date,pax_count,tour_code,pickup_location,departure_datetime,arrival_datetime,bus_id,driver_id',
            'charterBooking:id,invoice_id,rate_plan_id,reference,starts_at,ends_at,pickup_location,destination,passenger_count,passengers,status,bus_id,driver_id',
            'charterBooking.bus:id,plate_number,model,seating_capacity',
            'charterBooking.driver:id,first_name,last_name,phone,email',
            'educationalTourBooking:id,invoice_id,program_id,reference,school_name,grade_level,starts_at,ends_at,pickup_location,student_count,chaperone_count,passengers,status',
            'educationalTourBooking.vehicles:id,booking_id,bus_id,driver_id,planned_passengers',
            'educationalTourBooking.vehicles.bus:id,plate_number,model,seating_capacity',
            'educationalTourBooking.vehicles.driver:id,first_name,last_name,phone,email',
            'salesOrder.items:id,sales_order_id,line_number,service_id,service_type,fulfillment_type,fulfillment_id,status,title,description,quantity,unit_price,subtotal,tax_amount,total_amount,scheduled_start,scheduled_end,traveler_count,details_snapshot',
            'salesOrder.items.service:id,name,category,service_type',
            'salesOrder.items.fulfillment' => function (MorphTo $morphTo): void {
                $morphTo->morphWith([
                    PrivateTourBooking::class => ['bus:id,plate_number,model,seating_capacity', 'driver:id,first_name,last_name,phone,email'],
                ]);
            },
            'salesOrder.creditNotes:id,sales_order_id,invoice_id,credit_note_number,status,total_amount,reason,issued_at,posted_at',
            'salesOrder.refunds:id,sales_order_id,invoice_id,credit_note_id,refund_number,status,amount,refund_method,provider_refund_id,provider_status,reason,approved_at,processed_at,created_at',
        ];
    }
}
