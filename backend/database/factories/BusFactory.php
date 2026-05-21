<?php

namespace Database\Factories;

use App\Models\Bus;
use Illuminate\Database\Eloquent\Factories\Factory;

class BusFactory extends Factory
{
    protected $model = Bus::class;

    public function definition(): array
    {
        return [
            'plate_number' => strtoupper($this->faker->unique()->bothify('???-####')),
            'model' => $this->faker->word(),
            'seating_capacity' => $this->faker->numberBetween(20, 60),
            'status' => $this->faker->randomElement(['available', 'in_service', 'under_maintenance', 'decommissioned']),
            'total_mileage' => $this->faker->randomFloat(2, 0, 100000),
            'last_service_date' => $this->faker->optional()->date(),
            'next_service_due' => $this->faker->optional()->date(),
            'assigned_driver' => null,
        ];
    }
}
