<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Integrations\Mpesa\StkPushService;
use App\Integrations\Mpesa\MpesaClient;
use App\Domain\Finance\Services\LedgerPostingService;
use App\Domain\Inventory\Services\InventoryService;
use App\Models\Payment;
use App\Models\Order;
use App\Models\MpesaTransaction;
use App\Models\User;
use Illuminate\Support\Str;
use Mockery;

class StkPushServiceTest extends TestCase
{
    public function test_stk_callback_idempotency_prevents_duplicate_processing(): void
    {
        $orderId = (string) Str::uuid();
        $paymentId = (string) Str::uuid();
        $checkoutRequestId = 'ws_CO_28092026_123456';
        $customer = User::factory()->create();
        Order::create([
            'id' => $orderId,
            'order_number' => 'KS-ORD-STK-TEST-001',
            'customer_id' => $customer->id,
            'currency' => 'KES',
            'subtotal' => 1500,
            'discount_total' => 0,
            'delivery_fee' => 0,
            'tax_total' => 0,
            'grand_total' => 1500,
            'status' => 'PENDING_PAYMENT',
            'payment_status' => 'pending',
        ]);
        Payment::create([
            'id' => $paymentId,
            'payment_number' => 'PAY-STK-TEST-001',
            'order_id' => $orderId,
            'customer_id' => $customer->id,
            'provider' => 'mpesa',
            'method' => 'mpesa_stk',
            'amount' => 1500,
            'currency' => 'KES',
            'status' => 'pending',
        ]);

        // Pre-create already-processed M-Pesa transaction
        MpesaTransaction::create([
            'id' => (string) Str::uuid(),
            'payment_id' => $paymentId,
            'merchant_request_id' => 'MR-123',
            'checkout_request_id' => $checkoutRequestId,
            'phone_number' => '254712345678',
            'amount' => 1500.00,
            'processed_at' => now()->subMinutes(5),
            'mpesa_receipt_number' => 'QWE123RTY',
            'result_code' => 0,
        ]);

        $mpesaClient = Mockery::mock(MpesaClient::class);
        $ledgerService = Mockery::mock(LedgerPostingService::class);
        $inventoryService = Mockery::mock(InventoryService::class);

        // ledgerService must NEVER be called again on duplicate callback
        $ledgerService->shouldNotReceive('postOrderPayment');

        $stkService = new StkPushService($mpesaClient, $ledgerService, $inventoryService);

        $duplicatePayload = [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'MR-123',
                    'CheckoutRequestID' => $checkoutRequestId,
                    'ResultCode' => 0,
                    'ResultDesc' => 'The service request is processed successfully.',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 1500.00],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'QWE123RTY'],
                        ]
                    ]
                ]
            ]
        ];

        $result = $stkService->handleCallback($duplicatePayload);

        $this->assertEquals('duplicate', $result['status']);
    }
}
