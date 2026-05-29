<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Collection;

class BillingCollectionService
{
    public function syncCollection(Invoice $invoice)
    {
        // Only create/update collection if invoice is not fully paid, or if collection already exists
        if ($invoice->status === 'paid' && !$invoice->collection) {
            return;
        }

        $collection = $invoice->collection;

        if (!$collection) {
            // Determine service type from the first item
            $serviceType = $this->resolveServiceType($invoice);

            $collection = Collection::create([
                'invoice_id' => $invoice->id,
                'client_name' => $invoice->customer_name ?? 'Walk-in Customer',
                'customer_id' => $invoice->customer_id,
                'date' => $invoice->created_at->format('Y-m-d'),
                'travel_date' => $invoice->due_date ?? $invoice->created_at->format('Y-m-d'),
                'rate' => $invoice->total_amount,
                'status' => 'open',
                'service_type' => $serviceType,
                'billing_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->amount_received ?? 0,
                'remaining_balance' => $invoice->balance,
                'due_date' => $invoice->due_date,
                'collection_status' => $this->determineStatus($invoice),
                'auto_generated' => true,
            ]);
        } else {
            // Update existing collection
            $collection->billing_amount = $invoice->total_amount;
            $collection->paid_amount = $invoice->amount_received ?? 0;
            $collection->remaining_balance = $invoice->balance;
            $collection->due_date = $invoice->due_date;
            $collection->collection_status = $this->determineStatus($invoice);
            $collection->save();
        }
    }

    private function determineStatus(Invoice $invoice)
    {
        if ($invoice->balance <= 0) {
            return 'completed';
        }

        if (($invoice->amount_received ?? 0) == 0) {
            return 'pending';
        }

        if ($invoice->due_date && $invoice->due_date < date('Y-m-d')) {
            return 'overdue';
        }

        return 'partial';
    }

    public function resolveServiceType(Invoice $invoice): string
    {
        $firstItem = $invoice->items()->first();
        if (!$firstItem || !$firstItem->service) {
            return 'Other';
        }

        $category = strtolower($firstItem->service->category);
        
        $validTypes = [
            'bus rental' => 'Bus Rental',
            'educational tour' => 'Educational Tour',
            'tour package' => 'Tour Package',
            'visa processing' => 'Visa Processing',
            'joiners' => 'Joiners',
            'booking' => 'Booking',
        ];

        foreach ($validTypes as $key => $value) {
            if (str_contains($category, $key)) {
                return $value;
            }
        }

        return 'Other';
    }
}
