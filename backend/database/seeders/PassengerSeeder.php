<?php

namespace Database\Seeders;

use App\Models\Passenger;
use Illuminate\Database\Seeder;

class PassengerSeeder extends Seeder
{
    public function run(): void
    {
        $passengers = [
            [
                'customer_id' => 1,
                'first_name' => 'John',
                'last_name' => 'Doe',
                'birth_date' => '1990-01-01',
                'passport_no' => 'P1234567A',
                'contact_no' => '09123456789',
            ],
            [
                'customer_id' => 1,
                'first_name' => 'Little',
                'last_name' => 'Doe',
                'birth_date' => '2015-05-05',
                'contact_no' => '09123456789',
            ],
            [
                'customer_id' => 2,
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'birth_date' => '1985-12-12',
                'passport_no' => 'P9876543B',
                'contact_no' => '09876543210',
            ],
        ];

        foreach ($passengers as $passenger) {
            Passenger::create($passenger);
        }
    }
}
