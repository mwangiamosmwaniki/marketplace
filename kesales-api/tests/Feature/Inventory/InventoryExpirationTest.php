<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\InventoryItem;
use App\Jobs\ReleaseExpiredReservationsJob;
use App\Domain\Inventory\Services\InventoryService;
use Illuminate\Support\Str;

class InventoryExpirationTest extends TestCase
{
    public function test_release_expired_reservations_job_restores_stock_and_cancels_abandoned_order(): void
    {
        $variantId = (string) Str::uuid();
        $inventory = InventoryItem::create([
            'id' => (string) Str::uuid(),
            'variant_id' => $variantId,
            'quantity_on_hand' => 10,
            'reserved_quantity' => 2,
        ]);

        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-EXP-001',
            'customer_id' => (string) Str::uuid(),
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

        OrderItem::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'product_id' => (string) Str::uuid(),
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
        $this->assertEquals(0, $inventory->reserved_quantity);
        $this->assertEquals(12, $inventory->quantity_on_hand); // 10 + 2 restored
    }
}
