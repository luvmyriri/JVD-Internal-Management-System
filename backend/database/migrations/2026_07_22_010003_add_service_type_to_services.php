<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('service_type')->nullable()->index()->after('category');
        });

        $mapping = [
            'bus rental'=>'bus_rental','bus & van rental'=>'bus_rental','private tour'=>'private_tour','tour package'=>'private_tour',
            'joiners'=>'joiner_tour','joiner'=>'joiner_tour','educational tour'=>'educational_tour','visa processing'=>'visa_assistance',
            'visa assistance'=>'visa_assistance','passport'=>'passport_assistance','passport assistance'=>'passport_assistance',
            'flight'=>'flight_booking','flights'=>'flight_booking','hotel'=>'accommodation_booking','accommodation'=>'accommodation_booking',
            'ticket'=>'ticket_booking','ferry & bus ticket'=>'ticket_booking','activity'=>'activity_booking','activities'=>'activity_booking',
            'transfer'=>'transfer_service','custom'=>'custom_arrangement','custom transaction'=>'custom_arrangement',
        ];
        foreach ($mapping as $category => $type) {
            DB::table('services')->whereRaw('LOWER(category) = ?', [$category])->update(['service_type' => $type]);
        }
    }

    public function down(): void
    {
        Schema::table('services', fn (Blueprint $table) => $table->dropColumn('service_type'));
    }
};
