<?php

namespace Database\Factories;

use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class InventoryItemFactory extends Factory
{
    protected $model = InventoryItem::class;

    public function definition(): array
    {
        return [
            'item_name' => $this->faker->words(3, true),
            'category' => $this->faker->randomElement(['Supplies', 'Tools', 'Parts']),
            'quantity' => $this->faker->numberBetween(10, 100),
            'reorder_level' => $this->faker->numberBetween(5, 20),
            'unit' => $this->faker->randomElement(['pcs', 'box', 'set']),
            'unit_cost' => $this->faker->randomFloat(2, 5, 500),
        ];
    }
}
