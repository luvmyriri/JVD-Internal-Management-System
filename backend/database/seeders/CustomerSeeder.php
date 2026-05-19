<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = [
            ['first_name' => 'John', 'last_name' => 'Doe', 'email' => 'johnemmanuelnalang@gmail.com', 'phone' => '09123456789', 'address' => 'Manila'],
            ['first_name' => 'Jane', 'last_name' => 'Smith', 'email' => 'johnemmanuelnalang@gmail.com', 'phone' => '09876543210', 'address' => 'Quezon City'],
            ['first_name' => 'ACME', 'last_name' => 'Corp', 'email' => 'johnemmanuelnalang@gmail.com', 'phone' => '02-123-4567', 'address' => 'Makati'],
        ];

        foreach ($customers as $customer) {
            \App\Models\Customer::create($customer);
        }
    }
}
