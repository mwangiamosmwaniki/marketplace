<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('refund_number', 64)->unique();
            $table->uuid('order_id');
            $table->uuid('payment_id');
            $table->uuid('customer_id');
            $table->uuid('seller_id')->nullable();
            $table->decimal('amount', 14, 2);
            $table->text('reason');
            $table->string('status', 50)->default('requested');
            $table->uuid('requested_by');
            $table->uuid('approved_by')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('restrict');
            $table->foreign('payment_id')->references('id')->on('payments')->onDelete('restrict');
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('set null');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('return_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('return_number', 64)->unique();
            $table->uuid('order_id');
            $table->uuid('customer_id');
            $table->string('reason', 100);
            $table->string('status', 50)->default('requested');
            $table->string('tracking_number', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('restrict');
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');
        Schema::dropIfExists('refunds');
    }
};
