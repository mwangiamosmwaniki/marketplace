<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->string('carrier', 100)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->timestamp('delivered_at')->nullable();
        });

        Schema::create('seller_order_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('seller_order_id');
            $table->uuid('actor_id')->nullable();
            $table->string('from_status', 50);
            $table->string('to_status', 50);
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('seller_order_id')->references('id')->on('seller_orders')->onDelete('cascade');
            $table->foreign('actor_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['seller_order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_order_events');

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropColumn(['carrier', 'tracking_number', 'delivered_at']);
        });
    }
};