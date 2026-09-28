<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\FinancialTransaction;
use Illuminate\Support\Str;

class MpesaWebhookTest extends TestCase
{
    public function test_c2b_validation_accepts_correct_order_and_rejects_underpayment(): void
    {
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-TEST-100',
            'customer_id' => (string) Str::uuid(),
            'currency' => 'KES',
            'subtotal' => 2000.00,
            'discount_total' => 0.00,
            'delivery_fee' => 250.00,
            'grand_total' => 2250.00,
            'status' => 'PENDING_PAYMENT',
            'payment_status' => 'pending',
        ]);

        // 1. Underpayment rejection
        $responseUnder = $this->postJson('/webhooks/mpesa/c2b/validation', [
            'BillRefNumber' => 'KS-ORD-TEST-100',
            'TransAmount' => 1500.00, // Less than 2250.00
        ]);
        $responseUnder->assertJson(['ResultCode' => 'C2B00012']);

        // 2. Full payment acceptance
        $responseValid = $this->postJson('/webhooks/mpesa/c2b/validation', [
            'BillRefNumber' => 'KS-ORD-TEST-100',
            'TransAmount' => 2250.00,
        ]);
        $responseValid->assertJson(['ResultCode' => 0]);
    }

    public function test_c2b_confirmation_is_strictly_idempotent(): void
    {
        $orderId = (string) Str::uuid();
        $order = Order::create([
            'id' => $orderId,
            'order_number' => 'KS-ORD-TEST-200',
            'customer_id' => (string) Str::uuid(),
            'currency' => 'KES',
            'subtotal' => 5000.00,
            'discount_total' => 0.00,
            'delivery_fee' => 300.00,
            'grand_total' => 5300.00,
            'status' => 'PENDING_PAYMENT',
            'payment_status' => 'pending',
        ]);

        $subOrder = SellerOrder::create([
            'id' => (string) Str::uuid(),
            'order_id' => $orderId,
            'sub_order_number' => 'KS-SUB-TEST-200-A',
            'seller_id' => (string) Str::uuid(),
            'subtotal' => 5000.00,
            'commission_total' => 500.00,
            'seller_net_payout' => 4500.00,
            'fulfillment_status' => 'unfulfilled',
        ]);

        $payload = [
            'TransactionType' => 'Pay Bill',
            'TransID' => 'RKT99ABCD',
            'TransTime' => date('YmdHis'),
            'TransAmount' => 5300.00,
            'BusinessShortCode' => '174379',
            'BillRefNumber' => 'KS-ORD-TEST-200',
            'MSISDN' => '254712345678',
        ];

        // First confirmation
        $res1 = $this->postJson('/webhooks/mpesa/c2b/confirmation', $payload);
        $res1->assertStatus(200);

        $order->refresh();
        $this->assertEquals('PAYMENT_CONFIRMED', $order->status);
        $this->assertEquals('paid', $order->payment_status);

        // Verify ledger entries posted
        $clearingTx = FinancialTransaction::where('reference_id', $orderId)->first();
        $this->assertNotNull($clearingTx);

        // Second confirmation (duplicate webhook from Safaricom)
        $res2 = $this->postJson('/webhooks/mpesa/c2b/confirmation', $payload);
        $res2->assertStatus(200);
        $res2->assertJson(['ResultDesc' => 'Duplicate callback ignored; transaction already settled']);

        // Verify no duplicate payments or transactions created
        $paymentCount = Payment::where('provider_transaction_id', 'RKT99ABCD')->count();
        $this->assertEquals(1, $paymentCount);
    }
}
