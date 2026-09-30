<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('tax_type', 32)->default('standard');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('tax_type', 32)->default('standard');
            $table->decimal('taxable_amount', 12, 2)->nullable();
            $table->decimal('net_line_total', 12, 2)->nullable();
        });

        Schema::table('seller_order_items', function (Blueprint $table) {
            $table->decimal('discount', 12, 2)->default(0.00);
            $table->decimal('net_line_total', 12, 2)->nullable();
        });

        DB::table('order_items')->update([
            'taxable_amount' => DB::raw('line_total - tax'),
            'net_line_total' => DB::raw('line_total - discount'),
        ]);
        DB::table('seller_order_items')->update([
            'net_line_total' => DB::raw('unit_price * quantity'),
        ]);
    }

    public function down(): void
    {
        Schema::table('seller_order_items', function (Blueprint $table) {
            $table->dropColumn(['discount', 'net_line_total']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['tax_type', 'taxable_amount', 'net_line_total']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('tax_type');
        });
    }
};