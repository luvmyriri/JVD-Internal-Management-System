<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Customers
        DB::statement('CREATE INDEX IF NOT EXISTS customers_phone_index ON customers (phone)');
        
        // Purchase Orders
        DB::statement('CREATE INDEX IF NOT EXISTS purchase_orders_status_index ON purchase_orders (status)');
        
        // Job Orders
        DB::statement('CREATE INDEX IF NOT EXISTS job_orders_status_index ON job_orders (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS job_orders_bus_id_index ON job_orders (bus_id)');
        
        // Work Orders
        DB::statement('CREATE INDEX IF NOT EXISTS work_orders_status_index ON work_orders (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS work_orders_bus_id_index ON work_orders (bus_id)');
        
        // Trip Tickets
        DB::statement('CREATE INDEX IF NOT EXISTS trip_tickets_status_index ON trip_tickets (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS trip_tickets_bus_id_index ON trip_tickets (bus_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS trip_tickets_driver_id_index ON trip_tickets (driver_id)');
        
        // Buses
        DB::statement('CREATE INDEX IF NOT EXISTS buses_status_index ON buses (status)');
        
        // Invoices
        DB::statement('CREATE INDEX IF NOT EXISTS invoices_status_index ON invoices (status)');
        
        // Inventory Items
        DB::statement('CREATE INDEX IF NOT EXISTS inventory_items_item_name_index ON inventory_items (item_name)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS customers_phone_index');
        
        DB::statement('DROP INDEX IF EXISTS purchase_orders_status_index');
        
        DB::statement('DROP INDEX IF EXISTS job_orders_status_index');
        DB::statement('DROP INDEX IF EXISTS job_orders_bus_id_index');
        
        DB::statement('DROP INDEX IF EXISTS work_orders_status_index');
        DB::statement('DROP INDEX IF EXISTS work_orders_bus_id_index');
        
        DB::statement('DROP INDEX IF EXISTS trip_tickets_status_index');
        DB::statement('DROP INDEX IF EXISTS trip_tickets_bus_id_index');
        DB::statement('DROP INDEX IF EXISTS trip_tickets_driver_id_index');
        
        DB::statement('DROP INDEX IF EXISTS buses_status_index');
        
        DB::statement('DROP INDEX IF EXISTS invoices_status_index');
        
        DB::statement('DROP INDEX IF EXISTS inventory_items_item_name_index');
    }
};
