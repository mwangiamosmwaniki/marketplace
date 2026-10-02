<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->string('code', 32)->unique();
            $table->string('name', 150);
            $table->string('type', 50);
            $table->string('currency', 3)->default('KES');
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('transaction_number', 64)->unique();
            $table->string('type', 80);
            $table->string('reference_type', 80);
            $table->uuid('reference_id');
            $table->text('description');
            $table->string('status', 32)->default('posted');
            $table->timestamp('posted_at')->useCurrent();
            $table->uuid('created_by')->nullable();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('financial_transaction_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('financial_transaction_id');
            $table->integer('account_id');
            $table->decimal('debit', 14, 2)->default(0.00);
            $table->decimal('credit', 14, 2)->default(0.00);
            $table->string('currency', 3)->default('KES');
            $table->uuid('seller_id')->nullable();
            $table->uuid('order_id')->nullable();

            $table->foreign('financial_transaction_id')->references('id')->on('financial_transactions')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('restrict');
            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('set null');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');

            $table->index('account_id');
            $table->index('seller_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_transaction_lines');
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('accounts');
    }
};
