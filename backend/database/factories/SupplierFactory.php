<?php

namespace Database\Factories;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class SupplierFactory extends Factory
{
    protected $model = Supplier::class;

    public function definition(): array
    {
        return [
            'company_name' => $this->faker->unique()->company(),
            'contact_person' => $this->faker->name(),
            'phone' => $this->faker->phoneNumber(),
            'email' => $this->faker->unique()->safeEmail(),
            'address' => $this->faker->address(),
            'is_verified' => $this->faker->boolean(),
            'verified_at' => $this->faker->date(),
            'verified_by' => null,
            'payment_terms' => 'Net 30',
            'is_consignment' => false,
            'bank_name' => $this->faker->company(),
            'bank_account_number' => $this->faker->bankAccountNumber(),
            'tin_number' => $this->faker->uuid(),
            'accreditation_status' => $this->faker->randomElement(['pending', 'accredited', 'suspended', 'blacklisted']),
        ];
    }
}