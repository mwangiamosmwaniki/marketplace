<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('store_name');
            $table->string('slug')->unique();
            $table->string('legal_name');
            $table->string('seller_type', 50)->default('business');
            $table->string('status', 50)->default('pending');
            $table->decimal('commission_rate', 5, 2)->default(10.00);
            $table->text('description')->nullable();
            $table->text('logo_path')->nullable();
            $table->text('banner_path')->nullable();
            $table->decimal('rating', 3, 2)->default(5.00);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
        });

        Schema::create('seller_profiles', function (Blueprint $table) {
            $table->uuid('seller_id')->primary();
            $table->string('business_registration_number', 100)->nullable();
            $table->string('kra_pin', 50);
            $table->string('vat_number', 50)->nullable();
            $table->string('business_type', 100)->nullable();
            $table->string('country', 100)->default('Kenya');
            $table->string('county', 100);
            $table->string('town', 100);
            $table->text('physical_address');
            $table->text('postal_address')->nullable();
            $table->timestamp('updated_at')->useCurrent();

            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('cascade');
        });

        Schema::create('seller_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('seller_id');
            $table->string('document_type', 80);
            $table->string('document_number', 120)->nullable();
            $table->text('file_path');
            $table->string('status', 50)->default('pending');
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->uuid('verified_by')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('cascade');
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('seller_payout_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('seller_id');
            $table->string('type', 32);
            $table->string('account_name');
            $table->string('account_number', 100);
            $table->string('bank_name', 150)->nullable();
            $table->string('bank_code', 50)->nullable();
            $table->string('mpesa_number', 32)->nullable();
            $table->string('verification_status', 50)->default('pending');
            $table->boolean('is_primary')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_payout_accounts');
        Schema::dropIfExists('seller_documents');
        Schema::dropIfExists('seller_profiles');
        Schema::dropIfExists('sellers');
    }
};
