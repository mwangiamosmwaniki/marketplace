<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('set null');
            $table->string('name', 150);
            $table->string('slug', 150)->unique();
            $table->text('description')->nullable();
            $table->text('image_url')->nullable();
            $table->string('status', 32)->default('active');
            $table->integer('sort_order')->default(0);
        });

        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 150)->unique();
            $table->text('logo_url')->nullable();
            $table->boolean('is_official')->default(false);
            $table->string('status', 32)->default('active');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('seller_id');
            $table->foreignId('category_id')->constrained('categories')->onDelete('restrict');
            $table->foreignId('brand_id')->nullable()->constrained('brands')->onDelete('set null');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku', 100)->unique();
            $table->text('description');
            $table->text('short_description')->nullable();
            $table->string('status', 50)->default('active');
            $table->string('condition', 50)->default('new');
            $table->string('warranty_info')->nullable();
            $table->integer('return_policy_days')->default(15);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_flash_sale')->default(false);
            $table->boolean('is_express')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('restrict');
            $table->index('seller_id');
            $table->index('category_id');
            $table->index('status');
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->string('sku', 120)->unique();
            $table->string('name');
            $table->decimal('price', 12, 2);
            $table->decimal('discount_price', 12, 2)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->decimal('weight_kg', 6, 3)->default(0.500);
            $table->string('status', 32)->default('active');

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        Schema::create('product_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('variant_id')->nullable();
            $table->text('file_path');
            $table->string('alt_text')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
    }
};
