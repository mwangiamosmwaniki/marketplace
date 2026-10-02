<?php

namespace Tests\Unit;

use App\Domain\Settlement\Services\SellerSettlementService;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Support\Str;
use Tests\TestCase;

class SellerSettlementServiceTest extends TestCase
{
    public function test_reserve_available_balance_for_new_payout_request_is_explicit_and_transaction_safe(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Payout Reserving Store',
            'slug' => 'payout-reserve-store',
            'legal_name' => 'Payout Reserving Store Limited',
            'status' => 'approved',
        ]);
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-PAYOUT-RESERVE',
            'customer_id' => User::factory()->create()->id,
            'currency' => 'KES',
            'subtotal' => '2000.00',
            'discount_total' => '0.00',
            'delivery_fee' => '0.00',
            'tax_total' => '275.86',
            'grand_total' => '2000.00',
            'status' => 'DELIVERED',
            'payment_status' => 'paid',
        ]);
        SellerOrder::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'sub_order_number' => 'KS-SUB-PAYOUT-RESERVE',
            'seller_id' => $seller->id,
            'subtotal' => '2000.00',
            'commission_total' => '0.00',
            'seller_net_payout' => '2000.00',
            'fulfillment_status' => 'delivered',
            'is_settled' => false,
            'settlement_eligible_at' => now()->subDays(16),
        ]);
        Payout::create([
            'id' => (string) Str::uuid(),
            'payout_number' => 'PO-RESERVE-EXISTING',
            'seller_id' => $seller->id,
            'amount' => '1000.00',
            'currency' => 'KES',
            'method' => 'mpesa_b2c',
            'status' => 'processing',
        ]);

        $service = new SellerSettlementService();

        $this->assertFalse($service->reserveAvailableBalanceForPayout($seller->id, '1200.00'));
        $this->assertTrue($service->reserveAvailableBalanceForPayout($seller->id, '500.00'));
    }

    public function test_held_and_ambiguous_payouts_remain_reserved_from_available_balance(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Settlement Balance Store',
            'slug' => 'settlement-balance-store',
            'legal_name' => 'Settlement Balance Store Limited',
            'status' => 'approved',
        ]);
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-SETTLEMENT-BALANCE',
            'customer_id' => User::factory()->create()->id,
            'currency' => 'KES',
            'subtotal' => '2000.00',
            'discount_total' => '0.00',
            'delivery_fee' => '0.00',
            'tax_total' => '275.86',
            'grand_total' => '2000.00',
            'status' => 'DELIVERED',
            'payment_status' => 'paid',
        ]);
        SellerOrder::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'sub_order_number' => 'KS-SUB-SETTLEMENT-BALANCE-A',
            'seller_id' => $seller->id,
            'subtotal' => '2000.00',
            'commission_total' => '0.00',
            'seller_net_payout' => '2000.00',
            'fulfillment_status' => 'delivered',
            'is_settled' => false,
            'settlement_eligible_at' => now()->subDays(16),
        ]);

        foreach ([['completed', '500.00'], ['held', '300.00'], ['timeout_pending_reconciliation', '400.00']] as [$status, $amount]) {
            Payout::create([
                'id' => (string) Str::uuid(),
                'payout_number' => 'PO-'.strtoupper(Str::random(10)),
                'seller_id' => $seller->id,
                'amount' => $amount,
                'currency' => 'KES',
                'method' => 'mpesa_b2c',
                'status' => $status,
            ]);
        }

        $balances = (new SellerSettlementService())->calculateSellerBalances($seller->id);

        $this->assertSame('2000.00', $balances['eligible_settlement_total']);
        $this->assertSame('500.00', $balances['disbursed_payouts']);
        $this->assertSame('700.00', $balances['in_flight_payouts']);
        $this->assertSame('800.00', $balances['available_balance']);
    }
}