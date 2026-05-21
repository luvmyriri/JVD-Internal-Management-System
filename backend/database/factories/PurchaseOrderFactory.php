<?php

namespace Database\Factories;

use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderFactory extends Factory
{
    protected $model = PurchaseOrder::class;

    public function definition(): array
    {
        return [
            'po_number' => 'PO-' . strtoupper($this->faker->unique()->bothify('????-####')),
            'supplier_id' => Supplier::factory(),
            'created_by' => User::factory(),
            'verified_by' => null,
            'approved_by' => null,
            'status' => $this->faker->randomElement(['draft', 'pending_accounting_review', 'pending_ceo_approval', 'approved', 'rejected']),
            'total_amount' => $this->faker->randomFloat(2, 50, 10000),
            'rejection_notes' => null,
            'approved_at' => null,
        ];
    }
}
