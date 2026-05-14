<?php

namespace Database\Seeders;

use App\Models\InventoryItem;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'item_name' => 'Tires - Standard',
                'category' => 'Maintenance',
                'quantity' => 20,
                'unit' => 'pcs',
                'reorder_level' => 4,
                'unit_cost' => 4500.00
            ],
            [
                'item_name' => 'Engine Oil - 5L',
                'category' => 'Consumables',
                'quantity' => 50,
                'unit' => 'bottles',
                'reorder_level' => 10,
                'unit_cost' => 1200.00
            ],
            [
                'item_name' => 'Brake Pads - Rear',
                'category' => 'Maintenance',
                'quantity' => 12,
                'unit' => 'sets',
                'reorder_level' => 4,
                'unit_cost' => 2800.00
            ],
        ];

        foreach ($items as $item) {
            InventoryItem::create($item);
        }
    }
}
