<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_payout_accounts', function (Blueprint $table) {
            $table->string('verification_status', 50)->default('pending')->change();
        });
    }

    public function down(): void
    {
        Schema::table('seller_payout_accounts', function (Blueprint $table) {
            $table->string('verification_status', 50)->default('verified')->change();
        });
    }
};