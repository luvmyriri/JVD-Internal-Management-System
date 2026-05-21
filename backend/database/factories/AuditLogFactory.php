<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => $this->faker->randomElement(['POST', 'PUT', 'PATCH', 'DELETE']),
            'module' => $this->faker->randomElement(['purchase-orders', 'job-orders', 'users', 'work-orders']),
            'entity_type' => 'App\\Models\\User',
            'entity_id' => $this->faker->randomNumber(),
            'old_values' => json_encode(['status' => 'old']),
            'new_values' => json_encode(['status' => 'new']),
            'ip_address' => $this->faker->ipv4(),
            'created_at' => $this->faker->dateTime(),
        ];
    }
}
