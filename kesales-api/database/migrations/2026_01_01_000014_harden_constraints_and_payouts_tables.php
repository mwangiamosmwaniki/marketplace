<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add dedicated provider reference columns to payouts
        Schema::table('payouts', function (Blueprint $table) {
            if (!Schema::hasColumn('payouts', 'provider')) {
                $table->string('provider')->default('mpesa')->after('status');
                $table->string('provider_request_id')->nullable()->index()->after('provider');
                $table->string('provider_conversation_id')->nullable()->index()->after('provider_request_id');
                $table->string('provider_transaction_id')->nullable()->index()->after('provider_conversation_id');
            }
        });

        // 2. Coupon usages tracking table
        if (!Schema::hasTable('coupon_usages')) {
            Schema::create('coupon_usages', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('coupon_id');
                $table->uuid('user_id');
                $table->uuid('order_id');
                $table->timestamp('used_at')->useCurrent();

                $table->foreign('coupon_id')->references('id')->on('coupons')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();

                $table->unique(['coupon_id', 'user_id', 'order_id']);
                $table->index(['coupon_id', 'user_id']);
            });
        }

        // 3. API Idempotency Keys table for mobile networks and duplicate checkout prevention
        if (!Schema::hasTable('idempotency_keys')) {
            Schema::create('idempotency_keys', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('user_id')->nullable()->index();
                $table->string('idempotency_key')->index();
                $table->string('request_path');
                $table->string('request_hash');
                $table->integer('response_code')->nullable();
                $table->json('response_body')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('expires_at')->nullable();

                $table->unique(['user_id', 'idempotency_key']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
        Schema::dropIfExists('coupon_usages');
        Schema::table('payouts', function (Blueprint $table) {
            $table->dropColumn([
                'provider',
                'provider_request_id',
                'provider_conversation_id',
                'provider_transaction_id',
            ]);
        });
    }
};
