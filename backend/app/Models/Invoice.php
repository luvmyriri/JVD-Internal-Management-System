<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'customer_id',
        'customer_name',
        'customer_address',
        'customer_email',
        'customer_contact',
        'subtotal',
        'tax_amount',
        'total_amount',
        'amount_received',
        'change',
        'payment_method',
        'payment_url',
        'payment_id',
        'payment_type',
        'balance',
        'credited_amount',
        'refunded_amount',
        'due_date',
        'status',
        'requires_contract',
        'contract_gate_status',
        'created_by',
        'notes',
        'cash_budget_request_id',
        'finalized_snapshot',
        'finalized_at',
    ];

    protected function casts(): array
    {
        return [
            'requires_contract' => 'boolean',
            'finalized_snapshot' => 'array',
            'finalized_at' => 'datetime',
        ];
    }

    /**
     * Single source of truth for CASH-BASIS revenue recognition.
     *
     * Revenue is the money actually collected, not the amount invoiced. Since
     * `balance` is what the customer still owes (0 for a fully paid invoice,
     * the outstanding amount for a partial), collected = total_amount - balance.
     * This correctly counts only a deposit for a partial invoice and never
     * over-counts cash tendered above the total (that surfaces as `change`).
     *
     * Use `Invoice::collectedRevenueExpr()` inside `->sum()` and the
     * `revenueBearing()` scope to restrict to real, revenue-generating sales.
     * For a `SELECT ... as alias`, wrap the const yourself:
     * `DB::raw('SUM(' . Invoice::COLLECTED_REVENUE_SQL . ') as revenue')`.
     */
    public const COLLECTED_REVENUE_SQL = 'total_amount - COALESCE(balance, 0) - COALESCE(credited_amount, 0)';

    /**
     * The collected-revenue column expression, for passing to `->sum()`
     * (which applies its own `SUM(...)`), so do NOT pre-wrap it here.
     */
    public static function collectedRevenueExpr(): Expression
    {
        return DB::raw(self::COLLECTED_REVENUE_SQL);
    }

    /**
     * Invoices that represent a real sale whose collected money counts as revenue.
     * Excludes budget-disbursement invoices, which are an expense, not revenue.
     */
    public function scopeRevenueBearing($query)
    {
        return $query->whereIn('status', ['paid', 'partial'])
            ->whereNull('cash_budget_request_id');
    }

    /** Per-row cash-basis revenue (money collected so far on this invoice). */
    public function getCollectedAmountAttribute(): float
    {
        return max(0, (float) $this->total_amount - (float) $this->balance);
    }

    public function getTravelDateAttribute(): ?string
    {
        return $this->booking?->travel_date?->toDateString()
            ?? $this->charterBooking?->starts_at?->toDateString()
            ?? $this->educationalTourBooking?->starts_at?->toDateString()
            ?? $this->educationalTourParticipantBooking?->package?->starts_at?->toDateString()
            ?? $this->joinerReservation?->departure?->starts_at?->toDateString()
            ?? $this->privateTourFulfillment()?->starts_at?->toDateString()
            ?? $this->tripTicket?->date_of_travel
            ?? $this->due_date;
    }

    public function getTourCodeAttribute(): ?string
    {
        return $this->booking?->tour_code
            ?? $this->joinerReservation?->departure?->code
            ?? $this->charterBooking?->reference
            ?? $this->educationalTourBooking?->reference
            ?? $this->educationalTourParticipantBooking?->package?->tour_code
            ?? $this->educationalTourParticipantBooking?->reference
            ?? $this->tripTicket?->control_no;
    }

    public function getPickupLocationAttribute(): ?string
    {
        return $this->booking?->pickup_location
            ?? $this->charterBooking?->pickup_location
            ?? $this->educationalTourBooking?->pickup_location
            ?? $this->educationalTourParticipantBooking?->package?->pickup_location
            ?? $this->joinerReservation?->departure?->pickup_instructions
            ?? $this->privateTourFulfillment()?->pickup_location
            ?? $this->tripTicket?->pick_up;
    }

    public function getDestinationAttribute(): ?string
    {
        return $this->charterBooking?->destination
            ?? $this->privateTourFulfillment()?->destination
            ?? $this->educationalTourParticipantBooking?->package?->destination
            ?? $this->educationalTourParticipantBooking?->package?->name
            ?? $this->booking?->tour_code
            ?? $this->tripTicket?->drop_off
            ?? $this->tripTicket?->destination
            ?? $this->educationalTourBooking?->program?->name;
    }

    public function getBusIdAttribute(): ?int
    {
        return $this->booking?->bus_id
            ?? $this->charterBooking?->bus_id
            ?? $this->educationalTourBooking?->vehicles?->first()?->bus_id
            ?? $this->educationalTourParticipantBooking?->busAssignment?->bus_id
            ?? $this->joinerReservation?->departure?->bus_id
            ?? $this->privateTourFulfillment()?->bus_id
            ?? $this->tripTicket?->bus_id;
    }

    public function getDriverIdAttribute(): ?int
    {
        return $this->booking?->driver_id
            ?? $this->charterBooking?->driver_id
            ?? $this->educationalTourBooking?->vehicles?->first()?->driver_id
            ?? $this->educationalTourParticipantBooking?->busAssignment?->driver_id
            ?? $this->joinerReservation?->departure?->driver_id
            ?? $this->privateTourFulfillment()?->driver_id
            ?? $this->tripTicket?->driver_id;
    }

    public function getPaxCountAttribute(): int
    {
        if ($this->booking?->pax_count) {
            return (int) $this->booking->pax_count;
        }
        if ($this->charterBooking?->passenger_count) {
            return (int) $this->charterBooking->passenger_count;
        }
        if ($this->educationalTourBooking) {
            return (int) $this->educationalTourBooking->student_count
                + (int) $this->educationalTourBooking->chaperone_count;
        }
        if ($this->educationalTourParticipantBooking) {
            return 1;
        }
        if ($this->joinerReservation?->passenger_count) {
            return (int) $this->joinerReservation->passenger_count;
        }
        if ($this->privateTourFulfillment()?->passenger_count) {
            return (int) $this->privateTourFulfillment()->passenger_count;
        }

        return (int) ($this->tripTicket?->no_of_passengers ?? $this->passengers()->count());
    }

    /** @return array<int, string> */
    public function getSeatMapAttribute(): array
    {
        $bookingSeats = $this->booking?->seat_map;
        if (is_array($bookingSeats) && $bookingSeats !== []) {
            return array_values(array_filter($bookingSeats));
        }

        $charterSeats = $this->charterBooking?->selected_seats;
        if (is_array($charterSeats) && $charterSeats !== []) {
            return array_values(array_filter($charterSeats));
        }

        $participantSeat = $this->educationalTourParticipantBooking?->seat_number;
        if ($participantSeat) {
            return [$participantSeat];
        }

        $joinerSeats = $this->joinerReservation?->passengers
            ?->pluck('seat.seat_number')
            ->filter()
            ->values()
            ->all();

        return $joinerSeats ?: [];
    }

    /** Resolve the best customer email without rewriting the finalized invoice snapshot. */
    public function notificationEmail(): ?string
    {
        if ($this->exists) {
            // Keep this resolver safe when lazy loading is disabled and the
            // invoice has no direct customer_email value.
            $this->loadMissing([
                'customer',
                'charterBooking',
                'educationalTourBooking',
                'educationalTourParticipantBooking',
                'joinerReservation',
            ]);
        }

        return $this->attributes['customer_email']
            ?? $this->customer?->email
            ?? $this->charterBooking?->lead_email
            ?? $this->educationalTourBooking?->contact_email
            ?? $this->educationalTourParticipantBooking?->participant_email
            ?? $this->educationalTourParticipantBooking?->guardian_email
            ?? $this->joinerReservation?->lead_email;
    }

    /** Whether the customer bought a packaged travel service that carries the general agreement. */
    public function isPackageBooking(): bool
    {
        if ($this->educationalTourBooking || $this->educationalTourParticipantBooking || $this->joinerReservation) {
            return true;
        }

        return $this->items->contains(fn (InvoiceItem $item): bool => in_array(
            $item->service_type ?? $item->service?->service_type,
            ['educational_tour', 'private_tour', 'joiner_tour', 'joiners', 'tour_package'],
            true,
        ));
    }

    public function operationalBus(): ?Bus
    {
        return $this->booking?->bus
            ?? $this->charterBooking?->bus
            ?? $this->educationalTourBooking?->vehicles?->first()?->bus
            ?? $this->educationalTourParticipantBooking?->busAssignment?->bus
            ?? $this->joinerReservation?->departure?->bus
            ?? $this->privateTourFulfillment()?->bus
            ?? $this->tripTicket?->bus;
    }

    public function operationalDriver(): ?User
    {
        return $this->booking?->driver
            ?? $this->charterBooking?->driver
            ?? $this->educationalTourBooking?->vehicles?->first()?->driver
            ?? $this->educationalTourParticipantBooking?->busAssignment?->driver
            ?? $this->joinerReservation?->departure?->driver
            ?? $this->privateTourFulfillment()?->driver
            ?? $this->tripTicket?->driver;
    }

    private function privateTourFulfillment(): ?PrivateTourBooking
    {
        if (! $this->relationLoaded('salesOrder') || ! $this->salesOrder?->relationLoaded('items')) {
            return null;
        }

        return $this->salesOrder->items->first(
            fn (SalesOrderItem $item) => $item->relationLoaded('fulfillment')
                && $item->fulfillment instanceof PrivateTourBooking
        )?->fulfillment;
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function collection()
    {
        return $this->hasOne(Collection::class);
    }

    public function payments(): HasManyThrough
    {
        return $this->hasManyThrough(CollectionPayment::class, Collection::class);
    }

    public function contract(): HasOne
    {
        return $this->hasOne(Contract::class);
    }

    public function paymentSchedules(): HasMany
    {
        return $this->hasMany(PaymentSchedule::class)->orderBy('installment_number');
    }

    public function itineraries(): HasMany
    {
        return $this->hasMany(Itinerary::class)->orderBy('day_number');
    }

    public function passengers(): HasMany
    {
        return $this->hasMany(InvoicePassenger::class);
    }

    public function customTransactionDetail(): HasOne
    {
        return $this->hasOne(CustomTransactionDetail::class);
    }

    public function cashBudgetRequest(): BelongsTo
    {
        return $this->belongsTo(CashBudgetRequest::class);
    }

    public function tripTicket(): HasOne
    {
        return $this->hasOne(TripTicket::class)->orderBy('assignment_index');
    }

    public function tripTickets(): HasMany
    {
        return $this->hasMany(TripTicket::class)->orderBy('assignment_index');
    }

    public function booking(): HasOne
    {
        return $this->hasOne(Booking::class);
    }

    public function joinerReservation(): HasOne
    {
        return $this->hasOne(JoinerReservation::class);
    }

    public function charterBooking(): HasOne
    {
        return $this->hasOne(CharterBooking::class);
    }

    public function educationalTourBooking(): HasOne
    {
        return $this->hasOne(EducationalTourBooking::class);
    }

    public function educationalTourParticipantBooking(): HasOne
    {
        return $this->hasOne(EducationalTourParticipantBooking::class, 'invoice_id');
    }

    public function salesOrder(): HasOne
    {
        return $this->hasOne(SalesOrder::class);
    }

    public function bus()
    {
        return $this->hasOneThrough(Bus::class, Booking::class, 'invoice_id', 'id', 'id', 'bus_id');
    }

    public function driver()
    {
        return $this->hasOneThrough(User::class, Booking::class, 'invoice_id', 'id', 'driver_id', 'driver_id');
    }

    /**
     * Complete operational graph required by invoice APIs and generated documents.
     * Typed service fulfillment replaces the former catch-all Booking, so callers
     * must load the SalesOrder morph graph to retain fleet and driver details.
     */
    public static function operationalDocumentRelations(): array
    {
        return [
            'customer',
            'creator',
            'items.service',
            'collection.payments',
            'booking.bus',
            'booking.driver',
            'itineraries',
            'passengers',
            'customTransactionDetail.passportCase',
            'joinerReservation.departure.service',
            'joinerReservation.departure.bus',
            'joinerReservation.departure.driver',
            'joinerReservation.passengers.seat',
            'charterBooking.ratePlan',
            'charterBooking.bus',
            'charterBooking.driver',
            'educationalTourBooking.program',
            'educationalTourBooking.vehicles.bus',
            'educationalTourBooking.vehicles.driver',
            'educationalTourParticipantBooking.package',
            'educationalTourParticipantBooking.busAssignment.bus',
            'educationalTourParticipantBooking.busAssignment.driver',
            'tripTicket',
            'tripTickets.bus',
            'tripTickets.driver',
            'salesOrder.adjustments',
            'salesOrder.creditNotes.refunds',
            'salesOrder.refunds',
            'salesOrder.items.fulfillment' => function (MorphTo $morphTo): void {
                $morphTo->morphWith([
                    PrivateTourBooking::class => ['bus', 'driver'],
                ]);
            },
        ];
    }
}
