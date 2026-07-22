<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    protected $fillable = [
        'client_name', 'service_type', 'other_service_type', 'date', 'travel_date',
        'pick_up', 'drop_off', 'rate', 'customer_id', 'billing_amount',
        'remaining_balance', 'due_date', 'collection_status', 'paid_amount',
        'invoice_id', 'liquidation_id', 'employee_id', 'auto_generated', 'remarks'
    ];

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

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function liquidation()
    {
        return $this->belongsTo(Liquidation::class, 'liquidation_id');
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
            app(\App\Services\SalesOrderService::class)->captureInvoice($invoice, $invoice->created_by);
            app(\App\Services\SalesOrderService::class)->syncInvoiceFinancials($invoice);
        }

        // Update linked driver liquidation shortage if this is a driver shortage collection
        if ($this->liquidation_id) {
            $liquidation = \App\Models\Liquidation::find($this->liquidation_id);
            if ($liquidation) {
                $liquidation->shortage_amount = $this->remaining_balance;
                if ($this->remaining_balance <= 0 && $liquidation->status === 'disputed') {
                    $hasDisputedItems = $liquidation->items()->where('status', 'disputed')->exists();
                    if (!$hasDisputedItems) {
                        $liquidation->status = 'settled';
                    }
                }
                $liquidation->save();
            }
        }
    }
}
