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

    public function test_quote_exposes_explicit_coupon_funding_breakdown(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Coupon Funding Seller',
            'slug' => 'coupon-funding-seller',
            'legal_name' => 'Coupon Funding Seller Limited',
            'status' => 'approved',
            'commission_rate' => 10.00,
        ]);
        $category = Category::create(['name' => 'Kettles', 'slug' => 'kettles-coupon-funding']);
        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Electric Kettle',
            'slug' => 'electric-kettle-coupon-funding',
            'sku' => 'KETTLE-COUPON-FUNDING',
            'description' => 'Coupon funding test product.',
            'status' => 'active',
        ]);
        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'name' => 'Silver',
            'sku' => 'KETTLE-COUPON-SILVER',
            'price' => 12000.00,
        ]);

        DeliveryZone::create([
            'id' => (string) Str::uuid(),
            'county' => 'Nairobi',
            'towns' => json_encode(['Nairobi']),
            'home_delivery_fee' => 350.00,
            'pickup_station_fee' => 200.00,
            'estimated_days' => '1-2 days',
        ]);

        Coupon::create([
            'id' => (string) Str::uuid(),
            'code' => 'PLATFORMPROMO',
            'type' => 'fixed',
            'value' => 1000.00,
            'min_order_amount' => 10000.00,
            'max_discount' => null,
            'usage_limit' => 1,
            'per_customer_limit' => 1,
            'expires_at' => now()->addDay(),
            'funding' => 'platform',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/checkout/quote', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'county' => 'Nairobi',
            'delivery_type' => 'home_delivery',
            'coupon_code' => 'PLATFORMPROMO',
        ]);

        $response->assertStatus(200);
        $this->assertSame('platform', $response->json('coupon_funding'));
        $this->assertSame('1000.00', $response->json('discount_breakdown.platform_discount'));
        $this->assertSame('0.00', $response->json('discount_breakdown.seller_discount'));
        $this->assertSame('11000.00', $response->json('discount_breakdown.net_merchandise_value'));
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

        Coupon::create([
            'id' => (string) Str::uuid(),
            'code' => 'TAXDISCOUNT',
            'type' => 'fixed',
            'value' => 1000.00,
            'min_order_amount' => 0.00,
            'max_discount' => null,
            'usage_limit' => 1,
            'per_customer_limit' => 1,
            'expires_at' => now()->addDay(),
            'is_active' => true,
        ]);

        $quote = $this->postJson('/api/v1/checkout/quote', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'county' => 'Kiambu',
            'delivery_type' => 'home_delivery',
            'coupon_code' => 'TAXDISCOUNT',
        ]);
        $quote->assertStatus(200);

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
            'coupon_code' => 'TAXDISCOUNT',
        ]);

        $response->assertStatus(201);
        $orderData = $response->json('order');

        $this->assertSame(0, bccomp((string) $quote->json('grand_total'), (string) $orderData['grand_total'], 2));
        $this->assertSame(0, bccomp((string) $quote->json('tax_total'), (string) $orderData['tax_total'], 2));
        $this->assertSame('1000.00', $quote->json('items.0.discount'));
        $this->assertSame('11000.00', $quote->json('items.0.net_line_total'));

        // Check Master Order exists
        $this->assertDatabaseHas('orders', [
            'id' => $orderData['id'],
            'customer_id' => $user->id,
            'subtotal' => 12000.00,
            'discount_total' => 1000.00,
            'delivery_fee' => 350.00,
            'tax_total' => $quote->json('tax_total'),
            'grand_total' => $quote->json('grand_total'),
            'status' => 'PENDING_PAYMENT',
        ]);

        // CRITICAL P0 AUDIT REQUIREMENT: Master order_items records MUST exist
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderData['id'],
            'variant_id' => $variant->id,
            'unit_price' => 12000.00,
            'discount' => 1000.00,
            'net_line_total' => 11000.00,
            'quantity' => 1,
        ]);

        $quoteAfterCouponUse = $this->postJson('/api/v1/checkout/quote', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'county' => 'Kiambu',
            'delivery_type' => 'home_delivery',
            'coupon_code' => 'TAXDISCOUNT',
        ]);
        $quoteAfterCouponUse->assertStatus(200);
        $this->assertSame('0.00', $quoteAfterCouponUse->json('discount'));

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
