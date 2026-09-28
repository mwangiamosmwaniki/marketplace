<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_number', 64)->unique();
            $table->uuid('customer_id');
            $table->string('currency', 3)->default('KES');
            $table->decimal('subtotal', 14, 2);
            $table->decimal('discount_total', 14, 2)->default(0.00);
            $table->decimal('delivery_fee', 14, 2)->default(0.00);
            $table->decimal('tax_total', 14, 2)->default(0.00);
            $table->decimal('grand_total', 14, 2);
            $table->string('status', 50)->default('PENDING_PAYMENT');
            $table->string('payment_status', 50)->default('pending');
            $table->timestamp('placed_at')->useCurrent();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('users')->onDelete('restrict');
        });

        Schema::create('order_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('type', 32)->default('shipping');
            $table->string('full_name');
            $table->string('phone', 32);
            $table->string('county', 100);
            $table->string('town', 100);
            $table->text('street_address');
            $table->text('delivery_instructions')->nullable();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });

        Schema::create('seller_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('sub_order_number', 64)->unique();
            $table->uuid('seller_id');
            $table->decimal('subtotal', 14, 2);
            $table->decimal('delivery_share', 14, 2)->default(0.00);
            $table->decimal('commission_total', 14, 2);
            $table->decimal('seller_net_payout', 14, 2);
            $table->string('fulfillment_status', 50)->default('unfulfilled');
            $table->boolean('is_settled')->default(false);
            $table->timestamp('settlement_eligible_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('restrict');
        });

        Schema::create('seller_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('seller_order_id');
            $table->uuid('product_id');
            $table->uuid('variant_id');
            $table->string('product_name');
            $table->string('sku', 120);
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('seller_net_amount', 12, 2);

            $table->foreign('seller_order_id')->references('id')->on('seller_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products');
            $table->foreign('variant_id')->references('id')->on('product_variants');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_order_items');
        Schema::dropIfExists('seller_orders');
        Schema::dropIfExists('order_addresses');
        Schema::dropIfExists('orders');
    }
};
