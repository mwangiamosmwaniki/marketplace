<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\Product;
use App\Models\Seller;
use App\Models\Category;
use App\Models\User;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Jobs\ReleaseExpiredReservationsJob;
use App\Domain\Inventory\Services\InventoryService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class InventoryExpirationTest extends TestCase
{
    public function test_seller_inventory_adjustment_preserves_reservations_and_records_movement(): void
    {
        $sellerUser = $this->authenticateSeller(['email' => 'inventory-adjustment@test.shelterhub.ke']);
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Inventory Adjustment Seller',
            'slug' => 'inventory-adjustment-seller',
            'legal_name' => 'Inventory Adjustment Seller Limited',
            'status' => 'approved',
        ]);
        $category = Category::create(['name' => 'Hardware', 'slug' => 'inventory-adjustment-hardware']);
        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Adjustable Lamp',
            'slug' => 'inventory-adjustment-lamp',
            'sku' => 'INV-ADJ-LAMP',
            'description' => 'Seller inventory adjustment test product.',
            'status' => 'active',
        ]);
        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'sku' => 'INV-ADJ-LAMP-V1',
            'name' => 'Default',
            'price' => '1000.00',
        ]);
        $inventory = InventoryItem::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'seller_id' => $seller->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 3,
        ]);

        $this->postJson('/api/v1/seller/inventory/adjust', [
            'inventory_item_id' => $inventory->id,
            'adjustment_quantity' => -8,
            'reason' => 'Damaged stock',
        ])->assertStatus(422);

        $this->assertSame(0, InventoryMovement::where('inventory_item_id', $inventory->id)->count());

        $this->postJson('/api/v1/seller/inventory/adjust', [
            'inventory_item_id' => $inventory->id,
            'adjustment_quantity' => 5,
            'reason' => 'Restocked units',
        ])->assertOk();

        $inventory->refresh();
        $this->assertSame(15, $inventory->quantity_on_hand);
        $movement = InventoryMovement::where('inventory_item_id', $inventory->id)->firstOrFail();
        $this->assertSame(10, $movement->before_quantity);
        $this->assertSame(15, $movement->after_quantity);
    }

    public function test_release_expired_reservations_job_restores_stock_and_cancels_abandoned_order(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Inventory Expiration Seller',
            'slug' => 'inventory-expiration-seller',
            'legal_name' => 'Inventory Expiration Seller Limited',
            'status' => 'approved',
        ]);
        $category = Category::create(['name' => 'Lighting', 'slug' => 'lighting-inventory-expiration']);
        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Solar Lantern',
            'slug' => 'solar-lantern-inventory-expiration',
            'sku' => 'SOLAR-LANTERN-EXP',
            'description' => 'Solar lantern for reservation expiration test.',
            'status' => 'active',
        ]);
        $variantId = (string) Str::uuid();
        ProductVariant::create([
            'id' => $variantId,
            'product_id' => $product->id,
            'sku' => 'SOLAR-LANTERN-EXP-V1',
            'name' => 'Default',
            'price' => 2500,
        ]);
        $inventory = InventoryItem::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'variant_id' => $variantId,
            'seller_id' => $seller->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 2,
        ]);

        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-EXP-001',
            'customer_id' => User::factory()->create()->id,
            'currency' => 'KES',
            'subtotal' => 5000.00,
            'discount_total' => 0.00,
            'delivery_fee' => 250.00,
            'tax_total' => 0.00,
            'grand_total' => 5250.00,
            'status' => 'PENDING_PAYMENT',
            'payment_status' => 'pending',
            'created_at' => now()->subMinutes(20), // 20 mins ago (> 15 mins TTL)
        ]);
        DB::table('orders')->where('id', $order->id)->update([
            'created_at' => now()->subMinutes(20),
        ]);

        OrderItem::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'variant_id' => $variantId,
            'product_name' => 'Solar Lantern',
            'sku' => 'SLR-LAN-01',
            'quantity' => 2,
            'unit_price' => 2500.00,
            'line_total' => 5000.00,
        ]);

        $job = new ReleaseExpiredReservationsJob();
        $job->handle(new InventoryService());

        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);

        $inventory->refresh();
        $this->assertEquals(0, $inventory->quantity_reserved);
        $this->assertEquals(10, $inventory->quantity_on_hand);
    }
}
