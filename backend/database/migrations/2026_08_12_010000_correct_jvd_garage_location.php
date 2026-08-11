<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const OLD_LOCATION = 'Q24R+FP Caloocan, Metro Manila';

    private const NEW_LOCATION = 'Unit 6 Aryanna Village Center, Barangay 175, Susano Road, Camarin, Caloocan, 1400 Metro Manila';

    public function up(): void
    {
        Schema::table('charter_rate_plans', function (Blueprint $table) {
            $table->string('garage_location')->default(self::NEW_LOCATION)->change();
        });

        DB::table('charter_rate_plans')
            ->where('garage_location', self::OLD_LOCATION)
            ->update(['garage_location' => self::NEW_LOCATION]);
    }

    public function down(): void
    {
        DB::table('charter_rate_plans')
            ->where('garage_location', self::NEW_LOCATION)
            ->update(['garage_location' => self::OLD_LOCATION]);

        Schema::table('charter_rate_plans', function (Blueprint $table) {
            $table->string('garage_location')->default(self::OLD_LOCATION)->change();
        });
    }
};
