<?php

namespace Database\Factories;

use App\Models\WorkOrder;
use App\Models\User;
use App\Models\Bus;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkOrderFactory extends Factory
{
    protected $model = WorkOrder::class;

    public function definition(): array
    {
        return [
            'wo_number' => 'WO-' . strtoupper($this->faker->unique()->lexify('????-####')),
            'bus_id' => Bus::factory(),
            'assigned_to' => User::factory(),
            'created_by' => User::factory(),
            'status' => $this->faker->randomElement(['open', 'in_progress', 'completed']),
            'priority' => $this->faker->randomElement(['routine', 'urgent', 'critical']),
            'description' => $this->faker->paragraph(),
            'parts_used' => $this->faker->optional()->text(),
            'cost' => $this->faker->randomFloat(2, 100, 10000),
            'auto_generated' => $this->faker->boolean(),
        ];
    }
}
