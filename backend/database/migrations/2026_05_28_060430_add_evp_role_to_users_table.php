<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
                DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'executive_vice_president', 'human_resource', 'accounting', 'agent', 'driver', 'operations_manager', 'reservation_officer', 'office_staff', 'accounting_executive', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'service_adviser', 'head_mechanic'))");
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
                DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'human_resource', 'accounting', 'agent', 'driver', 'operations_manager', 'reservation_officer', 'office_staff', 'accounting_executive', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'service_adviser', 'head_mechanic'))");
            }
        });
    }
};
