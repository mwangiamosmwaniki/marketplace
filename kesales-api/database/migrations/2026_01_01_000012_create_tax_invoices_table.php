<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number', 64)->unique();
            $table->uuid('order_id');
            $table->uuid('seller_id')->nullable();
            $table->uuid('customer_id');
            $table->decimal('taxable_amount', 14, 2);
            $table->decimal('vat_amount', 14, 2);
            $table->decimal('total_amount', 14, 2);
            $table->string('etims_invoice_number', 100)->nullable();
            $table->text('etims_qr_code')->nullable();
            $table->string('etims_status', 50)->default('pending');
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('restrict');
            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_invoices');
    }
};
