<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'employee_id' => 'EMP-' . $this->faker->unique()->numberBetween(1000, 9999),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => fake()->randomElement(['admin', 'human_resource', 'accounting', 'agent']),
            'department' => fake()->word(),
            'is_active' => true,
            'must_change_password' => true,
            'remember_token' => Str::random(10),
        ];
    }
}
