<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('payment_number', 64)->unique();
            $table->uuid('order_id');
            $table->uuid('customer_id');
            $table->string('provider', 50);
            $table->string('method', 50);
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3)->default('KES');
            $table->string('status', 50)->default('pending');
            $table->string('provider_transaction_id', 150)->nullable();
            $table->string('provider_request_id', 150)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('restrict');
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('restrict');
        });

        Schema::create('mpesa_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payment_id');
            $table->string('merchant_request_id', 100);
            $table->string('checkout_request_id', 100)->unique();
            $table->string('mpesa_receipt_number', 100)->unique()->nullable();
            $table->integer('result_code')->nullable();
            $table->text('result_description')->nullable();
            $table->string('phone_number', 32);
            $table->decimal('amount', 14, 2);
            $table->timestamp('transaction_date')->nullable();
            $table->jsonb('raw_request')->nullable();
            $table->jsonb('raw_response')->nullable();
            $table->timestamp('processed_at')->nullable();

            $table->foreign('payment_id')->references('id')->on('payments')->onDelete('restrict');
            $table->index('checkout_request_id');
        });

        Schema::create('mpesa_callbacks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_type', 100);
            $table->string('checkout_request_id', 100)->nullable();
            $table->jsonb('payload');
            $table->string('processing_status', 50)->default('unprocessed');
            $table->timestamp('processed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mpesa_callbacks');
        Schema::dropIfExists('mpesa_transactions');
        Schema::dropIfExists('payments');
    }
};
