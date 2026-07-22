<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up():void
    {
        Schema::create('integration_events',function(Blueprint $table){
            $table->id();$table->string('provider')->index();$table->string('event_type')->index();$table->string('external_id')->nullable();
            $table->string('payload_hash',64);$table->string('status')->index();$table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->json('metadata')->nullable();$table->timestamp('received_at')->nullable();$table->timestamp('processed_at')->nullable();$table->text('error')->nullable();$table->timestamps();
            $table->unique(['provider','external_id']);
        });
    }
    public function down():void{Schema::dropIfExists('integration_events');}
};
