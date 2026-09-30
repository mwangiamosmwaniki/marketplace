<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->string('provider_status', 50)->nullable();
            $table->string('provider_result_code', 64)->nullable();
            $table->text('provider_result_message')->nullable();
            $table->timestamp('provider_requested_at')->nullable();
            $table->timestamp('provider_completed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropColumn([
                'provider_status',
                'provider_result_code',
                'provider_result_message',
                'provider_requested_at',
                'provider_completed_at',
            ]);
        });
    }
};