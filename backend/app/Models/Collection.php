<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    protected $guarded = [];

    public function payments()
    {
        return $this->hasMany(CollectionPayment::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function recalculate()
    {
        // If billing_amount is 0 or null, set it to rate (for manual/legacy collections)
        if ($this->billing_amount <= 0 && $this->rate > 0) {
            $this->billing_amount = $this->rate;
        }

        $this->paid_amount = $this->payments()->sum('amount');
        $this->remaining_balance = max(0, $this->billing_amount - $this->paid_amount);

        if ($this->remaining_balance <= 0) {
            $this->collection_status = 'completed';
        } else {
            if ($this->paid_amount == 0) {
                $this->collection_status = 'pending';
            } elseif ($this->due_date && $this->due_date < date('Y-m-d')) {
                $this->collection_status = 'overdue';
            } else {
                $this->collection_status = 'partial';
            }
        }

        $this->save();
        
        // Also update the linked invoice balance and status
        if ($this->invoice_id) {
            $invoice = $this->invoice;
            $invoice->balance = $this->remaining_balance;
            $invoice->amount_received = $this->paid_amount;
            $invoice->status = $this->remaining_balance <= 0 ? 'paid' : ($this->paid_amount > 0 ? 'partial' : 'pending_payment');
            $invoice->save();
        }
    }
}

