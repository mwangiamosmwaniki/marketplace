<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mpesa_callbacks', function (Blueprint $table) {
            $table->string('provider_event_id')->nullable()->unique();
            $table->string('payload_hash', 64)->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('received_at')->nullable();
            $table->timestamp('failed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mpesa_callbacks', function (Blueprint $table) {
            $table->dropUnique(['provider_event_id']);
            $table->dropColumn([
                'provider_event_id',
                'payload_hash',
                'attempts',
                'received_at',
                'failed_at',
            ]);
        });
    }
};