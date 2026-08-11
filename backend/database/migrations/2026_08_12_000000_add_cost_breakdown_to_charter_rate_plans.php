<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charter_rate_plans', function (Blueprint $table) {
            $table->string('garage_location')->default('Unit 6 Aryanna Village Center, Barangay 175, Susano Road, Camarin, Caloocan, 1400 Metro Manila');
            $table->string('pickup_location')->nullable();
            $table->string('destination')->nullable();
            $table->decimal('garage_distance_km', 10, 2)->default(0);
            $table->decimal('route_distance_km', 10, 2)->default(0);
            $table->decimal('total_distance_km', 10, 2)->default(0);
            $table->decimal('fuel_efficiency_km_per_liter', 8, 2)->default(2.5);
            $table->decimal('estimated_liters', 10, 2)->default(0);
            $table->decimal('diesel_price_per_liter', 10, 2)->default(0);
            $table->decimal('diesel_cost', 12, 2)->default(0);
            $table->decimal('driver_meals', 12, 2)->default(0);
            $table->decimal('toll_gate_fees', 12, 2)->default(0);
            $table->decimal('easytrip', 12, 2)->default(0);
            $table->decimal('autosweep', 12, 2)->default(0);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('desired_profit', 12, 2)->default(0);
            $table->decimal('total_expenses', 12, 2)->default(0);
            $table->decimal('projected_profit', 12, 2)->default(0);
            $table->boolean('auto_adjust_rate')->default(true);
            $table->json('pricing_metadata')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('charter_rate_plans', function (Blueprint $table) {
            $table->dropColumn([
                'garage_location', 'pickup_location', 'destination', 'garage_distance_km',
                'route_distance_km', 'total_distance_km', 'fuel_efficiency_km_per_liter',
                'estimated_liters', 'diesel_price_per_liter', 'diesel_cost', 'driver_meals',
                'toll_gate_fees', 'easytrip', 'autosweep', 'commission', 'desired_profit',
                'total_expenses', 'projected_profit', 'auto_adjust_rate', 'pricing_metadata',
            ]);
        });
    }
};
