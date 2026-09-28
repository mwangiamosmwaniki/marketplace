<?php

namespace Tests\Feature\Checkout;

use Tests\TestCase;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\InventoryItem;
use App\Models\DeliveryZone;
use App\Models\Order;
use Illuminate\Support\Str;

class CheckoutIdempotencyTest extends TestCase
{
    public function test_duplicate_idempotency_key_does_not_create_duplicate_order(): void
    {
        $user = $this->authenticateCustomer();

        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => (string) Str::uuid(),
            'store_name' => 'Apex Gadgets',
            'slug' => 'apex-gadgets',
            'status' => 'approved',
        ]);

        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'name' => 'Fast Charging Power Bank',
            'slug' => 'fast-charging-power-bank',
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'name' => '20000mAh',
            'sku' => 'PWR-20K',
            'price' => 3500.00,
        ]);

        InventoryItem::create([
            'id' => (string) Str::uuid(),
            'variant_id' => $variant->id,
            'quantity_on_hand' => 5,
            'reserved_quantity' => 0,
        ]);

        DeliveryZone::create([
            'id' => (string) Str::uuid(),
            'county' => 'Nairobi',
            'home_delivery_fee' => 250.00,
        ]);

        $idempotencyKey = (string) Str::uuid();
        $payload = [
            'source' => 'buy_now',
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 1]
            ],
            'shipping_address' => [
                'full_name' => 'David Omondi',
                'phone' => '0722000111',
                'county' => 'Nairobi',
                'town' => 'Westlands',
                'street_address' => 'Mpaka Road Parkview 3B',
            ],
            'delivery_type' => 'home_delivery',
        ];

        // First checkout request
        $res1 = $this->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/v1/checkout', $payload);
        $res1->assertStatus(201);
        $order1Id = $res1->json('order.id');

        // Second duplicate request (e.g. user retrying on flaky connection)
        $res2 = $this->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/v1/checkout', $payload);
        $res2->assertStatus(201);
        $res2->assertHeader('X-Cache-Lookup', 'IDEMPOTENT_REPLAY');

        // Only ONE order was created in DB
        $orderCount = Order::where('customer_id', $user->id)->count();
        $this->assertEquals(1, $orderCount);
    }
}
