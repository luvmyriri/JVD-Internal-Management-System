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
            [
                'name' => 'Bus Rental - Standard',
                'category' => 'Bus Rental',
                'price' => 15000.00,
                'description' => 'Standard bus rental for 24 hours',
                'image_url' => 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Bus Rental - Luxury',
                'category' => 'Bus Rental',
                'price' => 25000.00,
                'description' => 'Luxury bus rental with reclining seats and entertainment system',
                'image_url' => 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Travel Package - Boracay',
                'category' => 'Travel',
                'price' => 12000.00,
                'description' => '3 days 2 nights Boracay package per person',
                'image_url' => 'https://images.unsplash.com/photo-1540202404-a2f29036bb52?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Travel Package - Palawan',
                'category' => 'Travel',
                'price' => 18000.00,
                'description' => '4 days 3 nights Palawan package per person',
                'image_url' => 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Passport Processing',
                'category' => 'Documentation',
                'price' => 2500.00,
                'description' => 'Assistance with passport application and renewal',
                'image_url' => 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Visa Consultation',
                'category' => 'Documentation',
                'price' => 1500.00,
                'description' => 'Consultation for tourist and business visas',
                'image_url' => 'https://images.unsplash.com/photo-1589216532372-1c2a367900d9?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Hotel Booking - Manila',
                'category' => 'Accommodation',
                'price' => 4500.00,
                'description' => 'Standard room in Manila partner hotels',
                'image_url' => 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop'
            ],
            [
                'name' => 'Airport Transfer',
                'category' => 'Transportation',
                'price' => 1200.00,
                'description' => 'One-way airport transfer in Metro Manila',
                'image_url' => 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=800&auto=format&fit=crop'
            ],
        ];

        foreach ($services as $service) {
            \App\Models\Service::create($service);
        }
    }
}
