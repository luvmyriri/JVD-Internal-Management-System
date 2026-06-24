<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'due_date',
        'status',
        'requires_contract',
        'contract_gate_status',
        'created_by',
        'notes',
        'cash_budget_request_id',
        'bus_id',
        'driver_id',
        'seat_map',
        'travel_date',
        'arrival_datetime',
        'departure_datetime',
        'pickup_location',
        'tour_code',
        'pax_count',
    ];

    protected function casts(): array
    {
        return [
            'seat_map' => 'array',
            'requires_contract' => 'boolean',
        ];
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
        return $this->hasOne(TripTicket::class);
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    protected static function booted(): void
    {
        static::saved(function ($invoice) {
            self::syncToTravelSchedules($invoice);
        });

        static::deleted(function ($invoice) {
            self::deleteFromTravelSchedules($invoice);
        });
    }

    public static function syncToTravelSchedules($invoice): void
    {
        if ($invoice->status === 'cancelled' || !$invoice->bus_id || !$invoice->travel_date) {
            self::deleteFromTravelSchedules($invoice);
            return;
        }

        \DB::table('international_travels')
            ->where('reference_type', 'invoice')
            ->where('reference_id', $invoice->id)
            ->delete();

        \DB::table('local_travels')->updateOrInsert(
            ['reference_type' => 'invoice', 'reference_id' => $invoice->id],
            [
                'bus_id' => $invoice->bus_id,
                'driver_id' => $invoice->driver_id,
                'travel_date' => $invoice->travel_date,
                'duration' => '1 day',
                'pick_up' => $invoice->pickup_location ?? 'Not Specified',
                'drop_off' => $invoice->tour_code ?? 'Not Specified',
                'status' => $invoice->status ?? 'draft',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public static function deleteFromTravelSchedules($invoice): void
    {
        \DB::table('local_travels')
            ->where('reference_type', 'invoice')
            ->where('reference_id', $invoice->id)
            ->delete();

        \DB::table('international_travels')
            ->where('reference_type', 'invoice')
            ->where('reference_id', $invoice->id)
            ->delete();
    }
}
