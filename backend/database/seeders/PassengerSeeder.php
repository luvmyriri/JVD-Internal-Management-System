<?php

namespace Database\Seeders;

use App\Models\Passenger;
use Illuminate\Database\Seeder;

class PassengerSeeder extends Seeder
{
    public function run(): void
    {
        $customer = \App\Models\Customer::first();
        $customer2 = \App\Models\Customer::skip(1)->first() ?? $customer;

        $passengers = [
            [
                'customer_id' => $customer->id,
                'first_name' => 'John',
                'last_name' => 'Doe',
                'birth_date' => '1990-01-01',
                'passport_no' => 'P1234567A',
                'contact_no' => '09123456789',
            ],
            [
                'customer_id' => $customer->id,
                'first_name' => 'Little',
                'last_name' => 'Doe',
                'birth_date' => '2015-05-05',
                'contact_no' => '09123456789',
            ],
            [
                'customer_id' => $customer2->id,
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'birth_date' => '1985-12-12',
                'passport_no' => 'P9876543B',
                'contact_no' => '09876543210',
            ],
            [
                'customer_id' => $customer->id,
                'first_name' => 'Alice',
                'last_name' => 'Johnson',
                'contact_no' => '09121112222',
                'passport_no' => 'P1234567C',
                'birth_date' => '1990-05-15',
            ],
            [
                'customer_id' => $customer->id,
                'first_name' => 'Bob',
                'last_name' => 'Smith',
                'contact_no' => '09123334444',
                'passport_no' => 'P7654321D',
                'birth_date' => '1985-10-20',

            ],
        ];

        foreach ($passengers as $passenger) {
            Passenger::create($passenger);
        }
    }
}
