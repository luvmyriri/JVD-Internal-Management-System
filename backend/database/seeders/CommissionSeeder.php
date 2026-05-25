<?php

namespace Database\Seeders;

use App\Models\Commission;
use App\Models\CommissionItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class CommissionSeeder extends Seeder
{
    public function run(): void
    {
        $clint = User::where('email', 'clint@jvd.com')->first(); // Accounting
        $jhune = User::where('email', 'jhune@jvd.com')->first(); // Super Admin
        $lj = User::where('email', 'lj@jvd.com')->first(); // Dispatcher
        
        if (!$clint || !$jhune || !$lj) return;

        $com1 = Commission::create([
            'commissioner_name' => 'LJ Ogoy',
            'serial_no' => 'COM-2026-0001',
            'date' => now()->subDays(1),
            'status' => 'approved',
            'approved_by' => $jhune->id,
            'received_by' => $lj->id,
        ]);

        CommissionItem::create([
            'commission_id' => $com1->id,
            'travel_date' => now()->addDays(5),
            'destination' => 'Baguio City Tour',
            'quantity' => 1,
            'amount' => 2500.00,
        ]);

        $com2 = Commission::create([
            'commissioner_name' => 'Mia Abella',
            'serial_no' => 'COM-2026-0002',
            'date' => now(),
            'status' => 'draft',
        ]);

        CommissionItem::create([
            'commission_id' => $com2->id,
            'travel_date' => now()->addDays(12),
            'destination' => 'Enchanted Kingdom',
            'quantity' => 1,
            'amount' => 1800.00,
        ]);
    }
}
