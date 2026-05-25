<?php

namespace Database\Seeders;

use App\Models\Collection;
use App\Models\CollectionPayment;
use App\Models\Customer;
use Illuminate\Database\Seeder;

class CollectionSeeder extends Seeder
{
    public function run(): void
    {
        $customer = Customer::first();
        
        $col1 = Collection::create([
            'client_name' => 'San Miguel Corporation',
            'date' => now()->subDays(3),
            'travel_date' => now()->addDays(5),
            'pick_up' => 'JVD Terminal, Manila',
            'drop_off' => 'Session Road, Baguio City',
            'rate' => 25000.00,
            'customer_id' => $customer?->id,
            'status' => 'open',
        ]);

        CollectionPayment::create([
            'collection_id' => $col1->id,
            'payment_date' => now()->subDays(3),
            'payment_method' => 'Bank Transfer',
            'amount' => 15000.00,
            'balance' => 10000.00,
        ]);

        $col2 = Collection::create([
            'client_name' => 'Caloocan Elementary School',
            'date' => now()->subDays(1),
            'travel_date' => now()->addDays(12),
            'pick_up' => 'Caloocan Elementary School',
            'drop_off' => 'Enchanted Kingdom, Santa Rosa',
            'rate' => 18000.00,
            'customer_id' => $customer?->id,
            'status' => 'open',
        ]);

        CollectionPayment::create([
            'collection_id' => $col2->id,
            'payment_date' => now()->subDays(1),
            'payment_method' => 'Cash',
            'amount' => 5000.00,
            'balance' => 13000.00,
        ]);
    }
}
