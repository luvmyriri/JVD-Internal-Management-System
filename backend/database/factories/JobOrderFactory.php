<?php

namespace Database\Factories;

use App\Models\JobOrder;
use App\Models\User;
use App\Models\Customer;
use App\Models\Bus;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobOrderFactory extends Factory
{
    protected $model = JobOrder::class;

    public function definition(): array
    {
        return [
            'jo_number' => 'JO-' . strtoupper($this->faker->unique()->lexify('????-####')),
            'customer_id' => Customer::factory(),
            'bus_id' => Bus::factory(),
            'created_by' => User::factory(),
            'service_type' => $this->faker->randomElement(['bus_rental', 'field_trip', 'corporate_transport', 'travel_package', 'event']),
            'status' => $this->faker->randomElement(['created', 'confirmed', 'in_progress', 'completed', 'cancelled']),
            'service_date' => $this->faker->date(),
            'destination' => $this->faker->city(),
            'total_cost' => $this->faker->randomFloat(2, 1000, 50000),
            'notes' => $this->faker->optional()->paragraph(),
        ];
    }
}
