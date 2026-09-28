<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\InventoryItem;
use App\Models\DeliveryZone;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\SellerOrder;
use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Str;

class CheckoutApiTest extends TestCase
{
    public function test_calculate_quote_uses_database_prices_and_delivery_zone_rates(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Safari Electronics',
            'slug' => 'safari-electronics',
            'legal_name' => 'Safari Electronics Limited',
            'status' => 'approved',
            'commission_rate' => 10.00,
        ]);
        $category = Category::create(['name' => 'Phones', 'slug' => 'phones-checkout-quote']);

        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Smartphone Pro 256GB',
            'slug' => 'smartphone-pro-256gb',
            'sku' => 'PHN-256-QUOTE',
            'description' => 'Test smartphone for quote calculation.',
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'name' => 'Midnight Black',
            'sku' => 'PHN-256-BLK',
            'price' => 50000.00,
            'discount_price' => 45000.00,
        ]);

        DeliveryZone::create([
            'id' => (string) Str::uuid(),
            'county' => 'Nairobi',
            'towns' => json_encode(['Nairobi']),
            'home_delivery_fee' => 300.00,
            'pickup_station_fee' => 150.00,
            'estimated_days' => '1-2 days',
        ]);

        // Attempt quote: Note that client DOES NOT send unit_price; backend derives 45000.00
        $response = $this->postJson('/api/v1/checkout/quote', [
            'items' => [
                [
                    'variant_id' => $variant->id,
                    'quantity' => 2,
                ]
            ],
            'county' => 'Nairobi',
            'delivery_type' => 'home_delivery',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'subtotal' => 90000.00, // 2 * 45,000
            'delivery_fee' => 300.00,
            'grand_total' => 90300.00,
        ]);
    }

    public function test_create_order_persists_master_order_and_master_order_items(): void
    {
        $user = $this->authenticateCustomer();
        $sellerUser = User::factory()->create();

        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Nairobi Tech Hub',
            'slug' => 'nairobi-tech-hub',
            'legal_name' => 'Nairobi Tech Hub Limited',
            'status' => 'approved',
            'commission_rate' => 12.00,
        ]);
        $category = Category::create(['name' => 'Audio', 'slug' => 'audio-checkout-order']);

        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Noise Cancelling Headphones',
            'slug' => 'noise-cancelling-headphones',
            'sku' => 'HEAD-NC-001-PRODUCT',
            'description' => 'Test noise cancelling headphones.',
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'name' => 'Black Matte',
            'sku' => 'HEAD-NC-001',
            'price' => 12000.00,
        ]);

        InventoryItem::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'seller_id' => $seller->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
            'reorder_level' => 1,
        ]);

        DeliveryZone::create([
            'id' => (string) Str::uuid(),
            'county' => 'Kiambu',
            'towns' => json_encode(['Thika']),
            'home_delivery_fee' => 350.00,
            'pickup_station_fee' => 200.00,
            'estimated_days' => '1-2 days',
        ]);

        $response = $this->postJson('/api/v1/checkout', [
            'items' => [
                [
                    'variant_id' => $variant->id,
                    'quantity' => 1,
                ]
            ],
            'shipping_address' => [
                'full_name' => 'Alice Wambui',
                'phone' => '0712345678',
                'county' => 'Kiambu',
                'town' => 'Thika',
                'street_address' => 'Kenyatta Highway Plaza Suite 4',
            ],
            'delivery_type' => 'home_delivery',
        ]);

        $response->assertStatus(201);
        $orderData = $response->json('order');

        // Check Master Order exists
        $this->assertDatabaseHas('orders', [
            'id' => $orderData['id'],
            'customer_id' => $user->id,
            'subtotal' => 12000.00,
            'delivery_fee' => 350.00,
            'grand_total' => 12350.00,
            'status' => 'PENDING_PAYMENT',
        ]);

        // CRITICAL P0 AUDIT REQUIREMENT: Master order_items records MUST exist
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderData['id'],
            'variant_id' => $variant->id,
            'unit_price' => 12000.00,
            'quantity' => 1,
        ]);

        // Seller Sub-Orders and items must also exist
        $this->assertDatabaseHas('seller_orders', [
            'order_id' => $orderData['id'],
            'seller_id' => $seller->id,
            'subtotal' => 12000.00,
            'commission_total' => 1440.00, // 12% of 12,000
            'seller_net_payout' => 10560.00,
        ]);
    }
}
