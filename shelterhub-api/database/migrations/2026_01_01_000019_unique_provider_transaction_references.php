<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unique(
                ['provider', 'provider_transaction_id'],
                'payments_provider_transaction_unique'
            );
        });

        Schema::table('payouts', function (Blueprint $table) {
            $table->unique('provider_transaction_id', 'payouts_provider_transaction_unique');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('payments_provider_transaction_unique');
        });

        Schema::table('payouts', function (Blueprint $table) {
            $table->dropUnique('payouts_provider_transaction_unique');
        });
    }
};