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
        $categories = [
            ['name' => 'Passport Documents', 'slug' => 'passport', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Visa Documents', 'slug' => 'visa', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
        ];

        DB::table('document_categories')->insert($categories);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('document_categories')->whereIn('slug', ['passport', 'visa'])->delete();
    }
};
