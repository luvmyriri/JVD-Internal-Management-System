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
                'category' => 'Transport', 
                'price' => 15000.00, 
                'description' => 'Standard bus rental for 24 hours',
                'images' => ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Bus Rental - Luxury', 
                'category' => 'Transport', 
                'price' => 25000.00, 
                'description' => 'Luxury bus rental with reclining seats and entertainment system',
                'images' => ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Travel Package - Boracay', 
                'category' => 'Package', 
                'price' => 12000.00, 
                'description' => '3 days 2 nights Boracay package per person',
                'images' => ['https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Travel Package - Palawan', 
                'category' => 'Package', 
                'price' => 18000.00, 
                'description' => '4 days 3 nights Palawan package per person',
                'images' => ['https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Passport Processing', 
                'category' => 'Documentation', 
                'price' => 2500.00, 
                'description' => 'Assistance with passport application and renewal',
                'images' => ['https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Visa Consultation', 
                'category' => 'Documentation', 
                'price' => 1500.00, 
                'description' => 'Consultation for tourist and business visas',
                'images' => ['https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Hotel Booking - Manila', 
                'category' => 'Accommodation', 
                'price' => 4500.00, 
                'description' => 'Standard room in Manila partner hotels',
                'images' => ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800']
            ],
            [
                'name' => 'Airport Transfer', 
                'category' => 'Transport', 
                'price' => 1200.00, 
                'description' => 'One-way airport transfer in Metro Manila',
                'images' => ['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800']
            ],
        ];

        foreach ($services as $service) {
            \App\Models\Service::create($service);
        }
    }
}
