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
            $otherServiceType = null;

            // If it resolved to 'Other', store the actual service name for display
            if ($serviceType === 'Other') {
                $firstItem = $invoice->items()->first();
                $otherServiceType = $firstItem?->service?->name ?? $firstItem?->description ?? null;
            }

            $collection = Collection::create([
                'invoice_id'         => $invoice->id,
                'client_name'        => $invoice->customer_name ?? 'Walk-in Customer',
                'customer_id'        => $invoice->customer_id,
                'date'               => $invoice->created_at->format('Y-m-d'),
                'travel_date'        => $invoice->due_date ?? $invoice->created_at->format('Y-m-d'),
                'rate'               => $invoice->total_amount,
                'service_type'       => $serviceType,
                'other_service_type' => $otherServiceType,
                'billing_amount'     => $invoice->total_amount,
                'paid_amount'        => $invoice->amount_received ?? 0,
                'remaining_balance'  => $invoice->balance,
                'due_date'           => $invoice->due_date,
                'collection_status'  => $this->determineStatus($invoice),
                'auto_generated'     => true,
            ]);

            if ($invoice->amount_received > 0) {
                $collection->payments()->create([
                    'payment_date'   => $invoice->created_at->format('Y-m-d'),
                    'payment_method' => $invoice->payment_method ?? 'Cash',
                    'amount'         => $invoice->amount_received,
                    'balance'        => $invoice->balance,
                ]);
            }
        } else {
            // Update existing collection — also refresh service type if it was left as bare 'Other'
            $serviceType = $collection->service_type ?? $this->resolveServiceType($invoice);
            if ($serviceType === 'Other' && !$collection->other_service_type) {
                $firstItem = $invoice->items()->first();
                $collection->other_service_type = $firstItem?->service?->name ?? $firstItem?->description ?? null;
            }
            $collection->billing_amount    = $invoice->total_amount;
            $collection->paid_amount       = $invoice->amount_received ?? 0;
            $collection->remaining_balance = $invoice->balance;
            $collection->due_date          = $invoice->due_date;
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

        // Match against both service name and category
        $haystack = strtolower($firstItem->service->name . ' ' . $firstItem->service->category);

        $validTypes = [
            'bus rental'      => 'Bus Rental',
            'educational tour' => 'Educational Tour',
            'tour package'    => 'Tour Package',
            'package'         => 'Tour Package',
            'tour'            => 'Tour Package',
            'travel'          => 'Tour Package',
            'visa'            => 'Visa Processing',
            'visa processing' => 'Visa Processing',
            'joiners'         => 'Joiners',
            'booking'         => 'Booking',
        ];

        foreach ($validTypes as $key => $value) {
            if (str_contains($haystack, $key)) {
                return $value;
            }
        }

        return 'Other';
    }
}
