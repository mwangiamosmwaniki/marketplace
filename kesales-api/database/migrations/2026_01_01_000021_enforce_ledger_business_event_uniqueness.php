<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasDuplicateEvents = DB::table('financial_transactions')
            ->select('type', 'reference_type', 'reference_id')
            ->groupBy('type', 'reference_type', 'reference_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicateEvents) {
            throw new \RuntimeException('Resolve duplicate ledger business events before applying the unique constraint.');
        }

        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->unique(
                ['type', 'reference_type', 'reference_id'],
                'financial_transactions_business_event_unique'
            );
        });

        DB::table('accounts')->insertOrIgnore([
            'id' => 5300,
            'code' => '5300',
            'name' => 'Platform Promotion Discounts',
            'type' => 'expense',
            'currency' => 'KES',
            'is_active' => true,
            'created_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->dropUnique('financial_transactions_business_event_unique');
        });

        DB::table('accounts')->where('id', 5300)->delete();
    }
};