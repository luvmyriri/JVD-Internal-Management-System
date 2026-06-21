<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id', 'installment_number', 'due_date', 'amount_due', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'amount_due' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Generate N evenly-split installment rows for an invoice's total, starting from a given
     * date, spaced by $intervalDays apart. Pure calculation — caller persists via createMany().
     * The last installment absorbs the rounding remainder so the sum always equals total_amount exactly.
     */
    public static function generateInstallments(Invoice $invoice, int $count, \DateTimeInterface $firstDueDate, int $intervalDays = 30): array
    {
        $count = max(1, $count);
        $total = (float) $invoice->total_amount;
        $perInstallment = round($total / $count, 2);
        $rows = [];
        $runningTotal = 0.0;

        for ($i = 1; $i <= $count; $i++) {
            $amount = ($i === $count) ? round($total - $runningTotal, 2) : $perInstallment;
            $runningTotal += $amount;
            $dueDate = (new \DateTimeImmutable($firstDueDate->format('Y-m-d')))->modify('+' . ($intervalDays * ($i - 1)) . ' days');
            $rows[] = [
                'invoice_id' => $invoice->id,
                'installment_number' => $i,
                'due_date' => $dueDate->format('Y-m-d'),
                'amount_due' => $amount,
                'status' => 'pending',
            ];
        }

        return $rows;
    }

    /**
     * Re-derive this installment's status against the linked Collection's paid_amount.
     * Reads only — never writes money. Called on-demand (e.g. when the Collections page
     * loads) rather than via a queued job, since no scheduled reconciliation job exists yet.
     */
    public function reconcileAgainstCollection(): void
    {
        $collection = $this->invoice?->collection;
        $paidSoFar = $collection ? (float) $collection->paid_amount : 0.0;

        $cumulativeDueByThis = (float) self::where('invoice_id', $this->invoice_id)
            ->where('installment_number', '<=', $this->installment_number)
            ->sum('amount_due');

        if ($paidSoFar >= $cumulativeDueByThis) {
            $this->status = 'reconciled';
        } elseif ($this->due_date->isPast()) {
            $this->status = 'overdue';
        } elseif ($this->due_date->isToday()) {
            $this->status = 'due';
        } else {
            $this->status = 'pending';
        }

        $this->save();
    }
}
