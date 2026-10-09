<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;

class InvoiceDocumentLineService
{
    /** @return array<int, array<string, mixed>> */
    public function lines(Invoice $invoice): array
    {
        $fleet = $invoice->charterBooking?->fleet_assignments ?: [];
        $lines = [];

        foreach ($invoice->items as $item) {
            $quantity = max(1, (int) $item->quantity);
            if ($item->service_type === 'bus_rental' && $quantity > 1 && is_array($fleet) && $fleet !== []) {
                $lines = [...$lines, ...$this->charterUnits($item, $fleet, $quantity)];

                continue;
            }

            $lines[] = [
                'name' => $item->item_name ?? $item->service?->name ?? 'Travel service',
                'description' => $item->item_description ?? $item->service?->description,
                'category' => $item->service?->category ?? str_replace('_', ' ', $item->service_type ?? 'Custom service'),
                'quantity' => $item->quantity,
                'quantity_label' => $item->service_type === 'bus_rental'
                    ? $item->quantity.' '.($quantity === 1 ? 'bus' : 'buses')
                    : (string) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
                'adults' => $item->adults,
                'children' => $item->children,
                'adult_price' => $item->adult_price,
                'child_price' => $item->child_price,
            ];
        }

        return $lines;
    }

    /** @return array<int, array<string, mixed>> */
    private function charterUnits(InvoiceItem $item, array $fleet, int $quantity): array
    {
        $title = $item->item_name ?? $item->service?->name ?? 'Bus charter';
        $title = preg_replace('/\s*(?:\(\d+\s+buses?\s+for\s+\d+\s+pax\)|-\s*\d+\s+units?)\s*$/i', '', $title) ?: $title;
        $totalCents = (int) round((float) $item->total_price * 100);
        $baseCents = intdiv($totalCents, $quantity);
        $remainder = $totalCents % $quantity;
        $lines = [];

        for ($index = 0; $index < $quantity; $index++) {
            $assignment = $fleet[$index] ?? [];
            $plate = $assignment['plate_number'] ?? 'Vehicle pending';
            $model = $assignment['model'] ?? null;
            $driver = $assignment['driver_name'] ?? 'Driver pending';
            $capacity = $assignment['seating_capacity'] ?? null;
            $amount = ($baseCents + ($index < $remainder ? 1 : 0)) / 100;
            $details = ['Plate: '.$plate];
            if ($model) {
                $details[] = 'Model: '.$model;
            }
            $details[] = 'Driver: '.$driver;
            if ($capacity) {
                $details[] = 'Capacity: '.$capacity.' seats';
            }

            $lines[] = [
                'name' => $title.' — Bus '.($index + 1),
                'description' => implode(' | ', $details),
                'category' => 'Bus charter',
                'quantity' => 1,
                'quantity_label' => '1 bus',
                'unit_price' => $amount,
                'total_price' => $amount,
                'adults' => null,
                'children' => null,
                'adult_price' => null,
                'child_price' => null,
            ];
        }

        return $lines;
    }
}
