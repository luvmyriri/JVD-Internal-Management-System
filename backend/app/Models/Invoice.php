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
    public const COLLECTED_REVENUE_SQL = 'total_amount - COALESCE(balance, 0)';

    /**
     * The collected-revenue column expression, for passing to `->sum()`
     * (which applies its own `SUM(...)`), so do NOT pre-wrap it here.
     */
    public static function collectedRevenueExpr(): \Illuminate\Database\Query\Expression
    {
        return \Illuminate\Support\Facades\DB::raw(self::COLLECTED_REVENUE_SQL);
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
