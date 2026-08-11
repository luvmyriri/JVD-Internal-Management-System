<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Collection;

class BillingCollectionService
{
    public function syncCollection(Invoice $invoice)
    {
        $invoice->loadMissing(Invoice::operationalDocumentRelations());
        $collection = $invoice->collection;

        if (!$collection) {
            // Determine service type from the first item
            $serviceType = $this->resolveServiceType($invoice);
            $otherServiceType = null;

            // If it resolved to 'Other', store the actual service name for display
            if ($serviceType === 'Other') {
                $firstItem = $invoice->items()->first();
                $otherServiceType = $firstItem?->item_name ?? $firstItem?->service?->name ?? null;
            }

            $collection = Collection::create([
                'invoice_id'         => $invoice->id,
                'client_name'        => $invoice->customer_name ?? 'Walk-in Customer',
                'customer_id'        => $invoice->customer_id,
                'date'               => $invoice->created_at->format('Y-m-d'),
                'travel_date'        => $invoice->travel_date ?? $invoice->due_date ?? $invoice->created_at->format('Y-m-d'),
                'pick_up'            => $invoice->pickup_location,
                'drop_off'           => $invoice->destination,
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
                    'idempotency_key'=> "invoice:{$invoice->id}:initial-payment",
                ]);
            }
        } else {
            // Update existing collection — also refresh service type if it was left as bare 'Other'
            $serviceType = $collection->service_type ?? $this->resolveServiceType($invoice);
            if ($serviceType === 'Other' && !$collection->other_service_type) {
                $firstItem = $invoice->items()->first();
                $collection->other_service_type = $firstItem?->item_name ?? $firstItem?->service?->name ?? null;
            }
            $collection->billing_amount    = $invoice->total_amount;
            $collection->due_date          = $invoice->due_date;
            $collection->customer_id       = $invoice->customer_id;
            $collection->client_name       = $invoice->customer_name ?? $collection->client_name;
            $collection->travel_date       = $invoice->travel_date ?? $collection->travel_date;
            $collection->pick_up            = $invoice->pickup_location ?? $collection->pick_up;
            $collection->drop_off           = $invoice->destination ?? $collection->drop_off;

            // Sync payment records
            $invoicePaidAmount = $invoice->amount_received ?? 0;
            $existingPaidSum = $collection->payments()->sum('amount');
            $diff = $invoicePaidAmount - $existingPaidSum;

            if ($diff > 0) {
                $collection->payments()->create([
                    'payment_date'   => date('Y-m-d'),
                    'payment_method' => $invoice->payment_method ?? 'Cash',
                    'amount'         => $diff,
                    'balance'        => $invoice->balance,
                ]);
            }

            $collection->recalculate();
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
        if (!$firstItem) {
            return 'Other';
        }

        // Match against both service name and category
        $haystack = strtolower(implode(' ', array_filter([
            $firstItem->item_name,
            $firstItem->service_type,
            $firstItem->service?->name,
            $firstItem->service?->category,
        ])));

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
