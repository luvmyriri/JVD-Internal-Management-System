<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Delegates to individual seeders per Architecture § 2.1.
     */
    public function run(): void
    {
        $this->call([
            SuperAdminSeeder::class,
            CustomerSeeder::class,
            PassengerSeeder::class,
            ServiceSeeder::class,
            SupplierSeeder::class,
            BusSeeder::class,
            InventorySeeder::class,
            PurchaseOrderSeeder::class,
            WorkOrderSeeder::class,
            JobOrderSeeder::class,
            PassportCaseSeeder::class,
            AccreditationSeeder::class,
        ]);
    }
}
