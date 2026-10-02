<?php

namespace Tests\Unit;

use App\Domain\Finance\Services\InventoryService;
use App\Domain\Finance\Services\LedgerPostingService;
use App\Domain\Finance\Services\PaymentSettlementService;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaymentSettlementServiceTest extends TestCase
{
    public function test_provider_callback_is_the_single_settlement_authority_for_a_paid_payment(): void
    {
        $user = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => User::factory()->create()->id,
            'store_name' => 'Settlement Seller',
            'slug' => 'settlement-seller',
            'legal_name' => 'Settlement Seller Limited',
            'status' => 'approved',
            'commission_rate' => 10.00,
        ]);

        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-TEST-SETTLE-001',
            'customer_id' => $user->id,
            'currency' => 'KES',
            'subtotal' => '1200.00',
            'discount_total' => '0.00',
            'delivery_fee' => '0.00',
            'tax_total' => '200.00',
            'grand_total' => '1200.00',
            'status' => 'PENDING_PAYMENT',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::create([
            'id' => (string) Str::uuid(),
            'payment_number' => 'PAY-SETTLE-001',
            'order_id' => $order->id,
            'customer_id' => $user->id,
            'provider' => 'mpesa',
            'method' => 'stk_push',
            'amount' => '1200.00',
            'currency' => 'KES',
            'status' => 'initiated',
        ]);

        SellerOrder::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->id,
            'sub_order_number' => 'KS-SUB-TEST-001',
            'seller_id' => $seller->id,
            'subtotal' => '1200.00',
            'commission_total' => '120.00',
            'seller_net_payout' => '1080.00',
            'fulfillment_status' => 'unfulfilled',
        ]);

        $mpesaTxId = (string) Str::uuid();
        DB::table('mpesa_transactions')->insert([
            'id' => $mpesaTxId,
            'payment_id' => $payment->id,
            'merchant_request_id' => 'MERCHANT-001',
            'checkout_request_id' => 'CHECKOUT-001',
            'phone_number' => '254700000001',
            'amount' => '1200.00',
            'processed_at' => null,
        ]);

        $service = new PaymentSettlementService(
            app(\App\Domain\Inventory\Services\InventoryService::class),
            app(\App\Domain\Finance\Services\LedgerPostingService::class)
        );

        $result = $service->settleProviderCallback($mpesaTxId, 'MPESA-RECEIPT-001', '1200.00');

        $this->assertSame('settled', $result['status']);
        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);

        $duplicate = $service->settleProviderCallback($mpesaTxId, 'MPESA-RECEIPT-001', '1200.00');
        $this->assertSame('duplicate', $duplicate['status']);
    }
}
