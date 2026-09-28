<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('payout_number', 64)->unique();
            $table->uuid('seller_id');
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3)->default('KES');
            $table->string('method', 50)->default('mpesa_b2c');
            $table->string('status', 50)->default('pending');
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->uuid('processed_by')->nullable();
            $table->text('failure_reason')->nullable();

            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('restrict');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('payout_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payout_id');
            $table->uuid('seller_order_id');
            $table->decimal('amount', 14, 2);
            $table->decimal('commission_deduction', 14, 2);
            $table->decimal('net_amount', 14, 2);

            $table->foreign('payout_id')->references('id')->on('payouts')->onDelete('cascade');
            $table->foreign('seller_order_id')->references('id')->on('seller_orders')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_items');
        Schema::dropIfExists('payouts');
    }
};
