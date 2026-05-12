<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $services = [
            ['name' => 'Bus Rental - Standard', 'category' => 'Bus Rental', 'price' => 15000.00, 'description' => 'Standard bus rental for 24 hours'],
            ['name' => 'Bus Rental - Luxury', 'category' => 'Bus Rental', 'price' => 25000.00, 'description' => 'Luxury bus rental with reclining seats and entertainment system'],
            ['name' => 'Travel Package - Boracay', 'category' => 'Travel', 'price' => 12000.00, 'description' => '3 days 2 nights Boracay package per person'],
            ['name' => 'Travel Package - Palawan', 'category' => 'Travel', 'price' => 18000.00, 'description' => '4 days 3 nights Palawan package per person'],
            ['name' => 'Passport Processing', 'category' => 'Documentation', 'price' => 2500.00, 'description' => 'Assistance with passport application and renewal'],
            ['name' => 'Visa Consultation', 'category' => 'Documentation', 'price' => 1500.00, 'description' => 'Consultation for tourist and business visas'],
            ['name' => 'Hotel Booking - Manila', 'category' => 'Accommodation', 'price' => 4500.00, 'description' => 'Standard room in Manila partner hotels'],
            ['name' => 'Airport Transfer', 'category' => 'Transportation', 'price' => 1200.00, 'description' => 'One-way airport transfer in Metro Manila'],
        ];

        foreach ($services as $service) {
            \App\Models\Service::create($service);
        }
    }
}
