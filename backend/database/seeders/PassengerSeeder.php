<?php

namespace Database\Seeders;

use App\Models\Passenger;
use Illuminate\Database\Seeder;

class PassengerSeeder extends Seeder
{
    public function run(): void
    {
        $customer = \App\Models\Customer::first();
        if (!$customer) return;

        $passengers = [
            [
                'customer_id' => $customer->id,
                'first_name' => 'Alice',
                'last_name' => 'Johnson',
                'contact_no' => '09121112222',
                'passport_no' => 'P1234567A',
                'birth_date' => '1990-05-15',
            ],
            [
                'customer_id' => $customer->id,
                'first_name' => 'Bob',
                'last_name' => 'Smith',
                'contact_no' => '09123334444',
                'passport_no' => 'P7654321B',
                'birth_date' => '1985-10-20',
            ],
        ];

        foreach ($passengers as $passenger) {
            Passenger::create($passenger);
        }
    }
}
