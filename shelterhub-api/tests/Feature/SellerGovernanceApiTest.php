<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SellerGovernanceApiTest extends TestCase
{
    public function test_approved_seller_product_requires_catalog_approval(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Mwangaza Electronics',
            'slug' => 'mwangaza-electronics-test',
            'legal_name' => 'Mwangaza Electronics Limited',
            'status' => 'approved',
        ]);
        $category = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics-seller-test',
        ]);

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/products', [
                'name' => 'Solar Lantern',
                'category_id' => $category->id,
                'description' => 'Rechargeable lantern.',
                'price' => 2500,
                'stock' => 4,
            ])
            ->assertCreated()
            ->assertJsonPath('product.status', 'pending_approval')
            ->assertJsonPath('product.published_at', null);

        $this->assertDatabaseHas('products', [
            'seller_id' => $seller->id,
            'status' => 'pending_approval',
            'published_at' => null,
        ]);
    }

    public function test_pending_seller_cannot_create_a_product(): void
    {
        $sellerUser = User::factory()->create();
        Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Pending Store',
            'slug' => 'pending-store-test',
            'legal_name' => 'Pending Store Limited',
            'status' => 'pending',
        ]);
        $category = Category::create([
            'name' => 'Home',
            'slug' => 'home-seller-test',
        ]);

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/products', [
                'name' => 'Storage Basket',
                'category_id' => $category->id,
                'description' => 'Woven basket.',
                'price' => 800,
                'stock' => 2,
            ])
            ->assertForbidden();
    }

    public function test_seller_documents_are_uploaded_to_private_storage(): void
    {
        Storage::fake('local');
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Private Documents Store',
            'slug' => 'private-documents-store-test',
            'legal_name' => 'Private Documents Store Limited',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($sellerUser, 'sanctum')
            ->post('/api/v1/seller/documents', [
                'document_type' => 'national_id',
                'document_number' => 'ID-TEST-100',
                'file' => UploadedFile::fake()->create('identity.pdf', 128, 'application/pdf'),
            ], ['Accept' => 'application/json']);

        $response->assertCreated();
        $path = $response->json('document.file_path');

        Storage::disk('local')->assertExists($path);
        $this->assertStringStartsWith('seller-kyc/'.$seller->id.'/', $path);
        $this->assertDatabaseHas('seller_documents', [
            'seller_id' => $seller->id,
            'file_path' => $path,
        ]);
    }

    public function test_seller_cannot_read_or_update_another_sellers_product(): void
    {
        $sellerOneUser = User::factory()->create();
        Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerOneUser->id,
            'store_name' => 'Seller One',
            'slug' => 'seller-one-isolation',
            'legal_name' => 'Seller One Limited',
            'status' => 'approved',
        ]);

        $sellerTwoUser = User::factory()->create();
        $sellerTwo = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerTwoUser->id,
            'store_name' => 'Seller Two',
            'slug' => 'seller-two-isolation',
            'legal_name' => 'Seller Two Limited',
            'status' => 'approved',
        ]);
        $category = Category::create([
            'name' => 'Isolation Category',
            'slug' => 'isolation-category-test',
        ]);
        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $sellerTwo->id,
            'category_id' => $category->id,
            'name' => 'Seller Two Product',
            'slug' => 'seller-two-product-test',
            'sku' => 'SELLER-TWO-001',
            'description' => 'Owned by seller two.',
            'status' => 'active',
        ]);

        $this->actingAs($sellerOneUser, 'sanctum')
            ->getJson('/api/v1/seller/products/'.$product->id)
            ->assertNotFound();

        $this->actingAs($sellerOneUser, 'sanctum')
            ->patchJson('/api/v1/seller/products/'.$product->id, [
                'name' => 'Unauthorized change',
            ])
            ->assertNotFound();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Seller Two Product',
        ]);
    }
}