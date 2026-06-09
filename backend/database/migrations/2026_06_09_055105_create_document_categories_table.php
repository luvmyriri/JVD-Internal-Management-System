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
        Schema::create('document_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->json('allowed_roles')->nullable();
            $table->timestamps();
        });

        // Seed default document categories/folders
        $defaults = [
            ['name' => 'Receipts', 'slug' => 'receipt', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Invoices', 'slug' => 'invoice', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Delivery Notes', 'slug' => 'delivery_note', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Agreements', 'slug' => 'agreement', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Other', 'slug' => 'other', 'allowed_roles' => null, 'created_at' => now(), 'updated_at' => now()],
        ];

        DB::table('document_categories')->insert($defaults);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_categories');
    }
};
