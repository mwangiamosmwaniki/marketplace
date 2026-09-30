<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Support\Str;
use Tests\TestCase;

class SellerFulfillmentTest extends TestCase
{
    public function test_seller_fulfillment_requires_sequential_transitions_and_tracks_actor(): void
    {
        $sellerUser = $this->authenticateSeller(['email' => 'fulfillment-seller@test.kesales.ke']);
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Fulfillment Test Store',
            'slug' => 'fulfillment-test-store',
            'legal_name' => 'Fulfillment Test Store Limited',
            'status' => 'approved',
        ]);
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-FULFILLMENT-001',
            'customer_id' => User::factory()->create()->id,
            'currency' => 'KES',
            'subtotal' => '1000.00',
            'discount_total' => '0.00',
            'delivery_fee' => '100.00',
            'tax_total' => '137.93',
            'grand_total' => '1100.00',
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
        ]);
        $subOrder = SellerOrder::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'sub_order_number' => 'KS-SUB-FULFILLMENT-001-A',
            'seller_id' => $seller->id,
            'subtotal' => '1000.00',
            'commission_total' => '100.00',
            'seller_net_payout' => '900.00',
            'fulfillment_status' => 'unfulfilled',
        ]);
        $endpoint = '/api/v1/seller/orders/'.$subOrder->sub_order_number.'/fulfill';

        $this->postJson($endpoint, [
            'status' => 'dispatched',
            'carrier' => 'Test Carrier',
            'tracking_number' => 'TRACK-1001',
        ])->assertStatus(422);

        $this->postJson($endpoint, ['status' => 'processing'])->assertOk();
        $this->postJson($endpoint, ['status' => 'packed'])->assertOk();
        $this->postJson($endpoint, ['status' => 'dispatched'])->assertStatus(422);
        $this->postJson($endpoint, [
            'status' => 'dispatched',
            'carrier' => 'Test Carrier',
            'tracking_number' => 'TRACK-1001',
        ])->assertOk();
        $this->postJson($endpoint, ['status' => 'delivered'])->assertOk();

        $subOrder->refresh();
        $this->assertSame('delivered', $subOrder->fulfillment_status);
        $this->assertSame('Test Carrier', $subOrder->carrier);
        $this->assertSame('TRACK-1001', $subOrder->tracking_number);
        $this->assertNotNull($subOrder->delivered_at);
        $this->assertDatabaseCount('seller_order_events', 4);
        $this->assertDatabaseHas('seller_order_events', [
            'seller_order_id' => $subOrder->id,
            'actor_id' => $sellerUser->id,
            'from_status' => 'packed',
            'to_status' => 'dispatched',
        ]);
    }
}