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

    public function booking(): HasOne
    {
        return $this->hasOne(Booking::class);
    }
}
