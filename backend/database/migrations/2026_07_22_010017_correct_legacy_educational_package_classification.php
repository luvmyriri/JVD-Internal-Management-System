<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('services')
            ->where('service_type', 'private_tour')
            ->where(function ($query) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%educational%'])
                    ->orWhereRaw('LOWER(description) LIKE ?', ['%educational tour%'])
                    ->orWhereRaw('LOWER(description) LIKE ?', ['%school%'])
                    ->orWhereRaw('LOWER(category) LIKE ?', ['%educational%']);
            })
            ->update(['service_type' => 'educational_tour']);

        DB::table('services')
            ->where('service_type', 'private_tour')
            ->where(function ($query) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%joiner%'])
                    ->orWhereRaw('LOWER(category) IN (?, ?)', ['joiner', 'joiners']);
            })
            ->update(['service_type' => 'joiner_tour']);
    }

    public function down(): void
    {
        // Historical classification corrections are intentionally not guessed backwards.
    }
};
