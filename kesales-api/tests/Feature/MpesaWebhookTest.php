<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\Refund;
use App\Models\Seller;
use App\Models\User;
use App\Models\FinancialTransaction;
use App\Models\MpesaCallback;
use App\Jobs\ProcessMpesaCallbackJob;
use App\Integrations\Mpesa\StkPushService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Mockery;

class MpesaWebhookTest extends TestCase
{
    public function test_stk_callback_is_persisted_and_queued_once(): void
    {
        Queue::fake();
        $payload = [
            'Body' => [
                'stkCallback' => [
                    'CheckoutRequestID' => 'ws_CO_TEST_INBOX_001',
                    'ResultCode' => 0,
                ],
            ],
        ];

        $first = $this->postJson('/webhooks/mpesa/stk', $payload);
        $first->assertOk();
        $this->postJson('/webhooks/mpesa/stk', $payload)->assertOk();

        $this->assertDatabaseCount('mpesa_callbacks', 1);
        $this->assertDatabaseHas('mpesa_callbacks', [
            'provider_event_id' => 'ws_CO_TEST_INBOX_001',
            'processing_status' => 'queued',
        ]);
        $this->assertNotEmpty(DB::table('mpesa_callbacks')->value('payload_hash'));
        Queue::assertPushed(ProcessMpesaCallbackJob::class, function (ProcessMpesaCallbackJob $job) {
            return DB::table('mpesa_callbacks')->where('id', $job->callbackId)->exists();
        });
    }

    public function test_callback_job_loads_the_persisted_event_and_marks_it_processed(): void
    {
        $payload = [
            'Body' => ['stkCallback' => ['CheckoutRequestID' => 'ws_CO_JOB_001']],
        ];
        $callback = MpesaCallback::create([
            'id' => (string) Str::uuid(),
            'event_type' => 'mpesa.stk_callback',
            'provider_event_id' => 'ws_CO_JOB_001',
            'checkout_request_id' => 'ws_CO_JOB_001',
            'payload' => $payload,
            'processing_status' => 'queued',
            'attempts' => 0,
            'received_at' => now(),
            'created_at' => now(),
        ]);
        $stkService = Mockery::mock(StkPushService::class);
        $stkService->shouldReceive('handleCallback')
            ->once()
            ->with($payload)
            ->andReturn(['status' => 'success']);

        $job = new ProcessMpesaCallbackJob($callback->id);
        $job->handle($stkService);
        $job->handle($stkService);

        $this->assertDatabaseHas('mpesa_callbacks', [
            'id' => $callback->id,
            'processing_status' => 'processed',
            'attempts' => 1,
        ]);
        $this->assertNotNull($callback->fresh()->processed_at);
    }

    public function test_b2c_result_persists_provider_lifecycle_and_ignores_duplicate_success(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'B2C Lifecycle Store',
            'slug' => 'b2c-lifecycle-store',
            'legal_name' => 'B2C Lifecycle Store Limited',
            'status' => 'approved',
        ]);
        $payout = Payout::create([
            'id' => (string) Str::uuid(),
            'payout_number' => 'PAY-B2C-LIFECYCLE-001',
            'seller_id' => $seller->id,
            'amount' => '500.00',
            'currency' => 'KES',
            'method' => 'mpesa_b2c',
            'status' => 'processing',
            'provider' => 'mpesa',
            'provider_conversation_id' => 'AG_123456',
            'provider_request_id' => 'OR_123456',
            'provider_status' => 'submitted',
            'provider_requested_at' => now(),
        ]);
        $payload = [
            'Result' => [
                'ConversationID' => 'AG_123456',
                'OriginatorConversationID' => 'OR_123456',
                'ResultCode' => 0,
                'ResultDesc' => 'The service request is processed successfully.',
                'TransactionID' => 'B2CPROVIDER123',
            ],
        ];

        $this->postJson('/webhooks/mpesa/b2c-result', $payload)->assertOk();
        $this->postJson('/webhooks/mpesa/b2c-result', $payload)->assertOk();

        $payout->refresh();
        $this->assertSame('completed', $payout->status);
        $this->assertSame('completed', $payout->provider_status);
        $this->assertSame('0', $payout->provider_result_code);
        $this->assertSame('B2CPROVIDER123', $payout->provider_transaction_id);
        $this->assertNotNull($payout->provider_completed_at);
        $this->assertSame(1, FinancialTransaction::where('reference_id', $payout->id)->count());
    }

    public function test_terminal_payout_and_refund_statuses_ignore_late_provider_success_callbacks(): void
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Rejected B2C',
            'slug' => 'rejected-b2c',
            'legal_name' => 'Rejected B2C Limited',
            'status' => 'approved',
        ]);
        $payout = Payout::create([
            'id' => (string) Str::uuid(),
            'payout_number' => 'PAY-TERMINAL-FAILURE',
            'seller_id' => $seller->id,
            'amount' => '500.00',
            'currency' => 'KES',
            'method' => 'mpesa_b2c',
            'status' => 'failed',
            'provider' => 'mpesa',
            'provider_conversation_id' => 'AG_PAYOUT_TERMINAL',
            'provider_request_id' => 'OR_PAYOUT_TERMINAL',
            'provider_status' => 'failed',
        ]);

        $customer = User::factory()->create();
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-TERMINAL-FAILURE',
            'customer_id' => $customer->id,
            'currency' => 'KES',
            'subtotal' => '1200.00',
            'discount_total' => '0.00',
            'delivery_fee' => '0.00',
            'tax_total' => '165.52',
            'grand_total' => '1200.00',
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
        ]);
        $payment = Payment::create([
            'id' => (string) Str::uuid(),
            'payment_number' => 'PAY-TERMINAL-FAILURE',
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'provider' => 'mpesa',
            'method' => 'stk_push',
            'amount' => '1200.00',
            'currency' => 'KES',
            'status' => 'paid',
            'provider_transaction_id' => 'PAYMENTRECEIPTFAILURE',
        ]);
        $refund = Refund::create([
            'id' => (string) Str::uuid(),
            'refund_number' => 'REF-TERMINAL-FAILURE',
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'customer_id' => $customer->id,
            'amount' => '250.00',
            'reason' => 'Terminal rejection test',
            'status' => 'completed',
            'requested_by' => $customer->id,
            'provider_conversation_id' => 'REF_AG_002',
            'provider_request_id' => 'REF_OR_002',
            'provider_status' => 'completed',
        ]);

        $payoutResponse = $this->postJson('/webhooks/mpesa/b2c-result', [
            'Result' => [
                'ConversationID' => 'AG_PAYOUT_TERMINAL',
                'OriginatorConversationID' => 'OR_PAYOUT_TERMINAL',
                'ResultCode' => 0,
                'ResultDesc' => 'Late success callback',
                'TransactionID' => 'PAYOUTTERMINAL123',
            ],
        ]);
        $payoutResponse->assertOk();

        $refundResponse = $this->postJson('/webhooks/mpesa/b2c-result', [
            'Result' => [
                'ConversationID' => 'REF_AG_002',
                'OriginatorConversationID' => 'REF_OR_002',
                'ResultCode' => 0,
                'ResultDesc' => 'Late refund success callback',
                'TransactionID' => 'REFUNDTERMINAL123',
            ],
        ]);
        $refundResponse->assertOk();

        $payout->refresh();
        $refund->refresh();

        $this->assertSame('failed', $payout->status);
        $this->assertSame('completed', $refund->status);
    }

    public function test_refund_result_persists_provider_lifecycle_and_ignores_duplicate_success(): void
    {
        $customer = User::factory()->create();
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-REFUND-LIFECYCLE',
            'customer_id' => $customer->id,
            'currency' => 'KES',
            'subtotal' => '1200.00',
            'discount_total' => '0.00',
            'delivery_fee' => '0.00',
            'tax_total' => '165.52',
            'grand_total' => '1200.00',
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
        ]);
        $payment = Payment::create([
            'id' => (string) Str::uuid(),
            'payment_number' => 'PAY-REFUND-LIFECYCLE',
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'provider' => 'mpesa',
            'method' => 'stk_push',
            'amount' => '1200.00',
            'currency' => 'KES',
            'status' => 'paid',
            'provider_transaction_id' => 'PAYMENTRECEIPT001',
        ]);
        $refund = Refund::create([
            'id' => (string) Str::uuid(),
            'refund_number' => 'REF-REFUND-LIFECYCLE',
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'customer_id' => $customer->id,
            'amount' => '250.00',
            'reason' => 'Test confirmed refund',
            'status' => 'provider_pending',
            'requested_by' => $customer->id,
            'provider_conversation_id' => 'REF_AG_001',
            'provider_request_id' => 'REF_OR_001',
            'provider_status' => 'submitted',
        ]);
        $payload = [
            'Result' => [
                'ConversationID' => 'REF_AG_001',
                'OriginatorConversationID' => 'REF_OR_001',
                'ResultCode' => 0,
                'ResultDesc' => 'Refund reversal completed.',
                'TransactionID' => 'REFUNDPROVIDER001',
            ],
        ];

        $this->postJson('/webhooks/mpesa/b2c-result', $payload)->assertOk();
        $this->postJson('/webhooks/mpesa/b2c-result', $payload)->assertOk();

        $refund->refresh();
        $this->assertSame('completed', $refund->status);
        $this->assertSame('completed', $refund->provider_status);
        $this->assertSame('0', $refund->provider_result_code);
        $this->assertSame('REFUNDPROVIDER001', $refund->provider_transaction_id);
        $this->assertNotNull($refund->provider_completed_at);
        $this->assertSame(1, FinancialTransaction::where('reference_id', $refund->id)->count());
    }

    public function test_c2b_validation_accepts_correct_order_and_rejects_underpayment(): void
    {
        $customer = $this->authenticateCustomer();
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-TEST-100',
            'customer_id' => $customer->id,
            'currency' => 'KES',
            'subtotal' => 2000.00,
            'discount_total' => 0.00,
            'delivery_fee' => 250.00,
            'grand_total' => 2250.00,
            'status' => 'PENDING_PAYMENT',
            'payment_status' => 'pending',
        ]);

        // 1. Underpayment rejection
        $responseUnder = $this->postJson('/webhooks/mpesa/c2b-validation', [
            'BillRefNumber' => 'KS-ORD-TEST-100',
            'TransAmount' => 1500.00, // Less than 2250.00
        ]);
        $responseUnder->assertJson(['ResultCode' => 'C2B00012']);

        // 2. Full payment acceptance
        $responseValid = $this->postJson('/webhooks/mpesa/c2b-validation', [
            'BillRefNumber' => 'KS-ORD-TEST-100',
            'TransAmount' => 2250.00,
        ]);
        $responseValid->assertJson(['ResultCode' => 0]);
    }

    public function test_c2b_confirmation_is_strictly_idempotent(): void
    {
        $customer = $this->authenticateCustomer();
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Webhook Test Store',
            'slug' => 'webhook-test-store',
            'legal_name' => 'Webhook Test Store Limited',
            'status' => 'approved',
        ]);
        $orderId = (string) Str::uuid();
        $order = Order::create([
            'id' => $orderId,
            'order_number' => 'KS-ORD-TEST-200',
            'customer_id' => $customer->id,
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
            'seller_id' => $seller->id,
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
        $res1 = $this->postJson('/webhooks/mpesa/c2b-confirmation', $payload);
        $res1->assertStatus(200);

        $order->refresh();
        $this->assertEquals('PAYMENT_CONFIRMED', $order->status);
        $this->assertEquals('paid', $order->payment_status);

        // Verify ledger entries posted
        $clearingTx = FinancialTransaction::where('reference_id', $orderId)->first();
        $this->assertNotNull($clearingTx);

        // Second confirmation (duplicate webhook from Safaricom)
        $res2 = $this->postJson('/webhooks/mpesa/c2b-confirmation', $payload);
        $res2->assertStatus(200);
        $res2->assertJson(['ResultDesc' => 'Duplicate callback ignored; transaction already settled']);

        // Verify no duplicate payments or transactions created
        $paymentCount = Payment::where('provider_transaction_id', 'RKT99ABCD')->count();
        $this->assertEquals(1, $paymentCount);
    }
}
