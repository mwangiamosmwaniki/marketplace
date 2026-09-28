<?php

namespace Tests\Feature\Finance;

use Tests\TestCase;
use App\Models\Seller;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\Payout;
use App\Domain\Settlement\Services\SellerSettlementService;
use Illuminate\Support\Str;

class SellerSettlementTest extends TestCase
{
    public function test_payout_request_enforces_settlement_eligibility_and_balance_bounds(): void
    {
        $user = $this->authenticateSeller();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'store_name' => 'Kenyatta Leather Works',
            'slug' => 'kenyatta-leather-works',
            'status' => 'approved',
            'commission_rate' => 10.00,
        ]);

        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-SETTLE-001',
            'customer_id' => (string) Str::uuid(),
            'currency' => 'KES',
            'subtotal' => 10000.00,
            'discount_total' => 0.00,
            'delivery_fee' => 0.00,
            'tax_total' => 0.00,
            'grand_total' => 10000.00,
            'status' => 'COMPLETED',
            'payment_status' => 'paid',
        ]);

        // Create delivered sub-order delivered 20 days ago (past 15-day return window)
        $subOrder = SellerOrder::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'sub_order_number' => 'KS-SUB-SETTLE-001',
            'seller_id' => $seller->id,
            'subtotal' => 10000.00,
            'commission_total' => 1000.00,
            'seller_net_payout' => 9000.00,
            'fulfillment_status' => 'delivered',
            'delivered_at' => now()->subDays(20),
            'is_settled' => false,
        ]);

        $settlementService = new SellerSettlementService();
        $balances = $settlementService->calculateSellerBalances($seller->id);

        $this->assertEquals('9000.00', $balances['available_balance']);

        // 1. Payout request exceeding 9000 is rejected
        $resOver = $this->postJson('/api/v1/seller/payouts/request', [
            'amount' => 15000.00,
            'method' => 'mpesa_b2c',
        ]);
        $resOver->assertStatus(422);

        // 2. Valid payout request within 9000 is accepted
        $resValid = $this->postJson('/api/v1/seller/payouts/request', [
            'amount' => 5000.00,
            'method' => 'mpesa_b2c',
        ]);
        $resValid->assertStatus(201);

        // Available balance locks in-flight payout
        $newBalances = $settlementService->calculateSellerBalances($seller->id);
        $this->assertEquals('4000.00', $newBalances['available_balance']);
        $this->assertEquals('5000.00', $newBalances['in_flight_payouts']);
    }
}
