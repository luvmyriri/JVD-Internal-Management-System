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
            WorkflowSeeder::class,
            RolePermissionSeeder::class,
            RoleAbilitySeeder::class,
            SuperAdminSeeder::class,
        ]);

        // Guard against running dummy data seeders in production
        if (!app()->environment('production')) {
            $this->call([
                EmployeeSeeder::class,
                EmployeeSalarySeeder::class,
                CustomerSeeder::class,
                PassengerSeeder::class,
                ServiceSeeder::class,
                SupplierSeeder::class,
                BusSeeder::class,
                CharterRatePlanSeeder::class,
                EducationalProgramSeeder::class,
                InventorySeeder::class,
                WorkOrderSeeder::class,
                JobOrderSeeder::class,
                PurchaseOrderSeeder::class,
                TripTicketSeeder::class,
                CashBudgetRequestSeeder::class,
                CommissionSeeder::class,
                CollectionSeeder::class,
                PassportSeeder::class,
                AccreditationSeeder::class,
                InvoiceSeeder::class,
                AuditLogSeeder::class,
                LegalDocumentSeeder::class,
                SalesSystemSeeder::class,
            ]);
        }
    }
}
