<?php

namespace App\Http\Controllers\Webhooks;

use App\Integrations\Mpesa\StkPushService;
use App\Models\MpesaCallback;
use App\Models\Payment;
use App\Models\Order;
use App\Models\Payout;
use App\Domain\Finance\Services\LedgerPostingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class MpesaWebhookController extends BaseController
{
    public function __construct(
        protected StkPushService $stkService,
        protected LedgerPostingService $ledgerService
    ) {}

    public function handleStkCallback(Request $request): JsonResponse
    {
        $payload = $request->all();

        // 1. Record raw callback for idempotency & audit
        $checkoutReqId = $payload['Body']['stkCallback']['CheckoutRequestID'] ?? null;
        $cb = MpesaCallback::create([
            'id' => (string) Str::uuid(),
            'event_type' => 'mpesa.stk_callback',
            'checkout_request_id' => $checkoutReqId,
            'payload' => $payload,
            'processing_status' => 'unprocessed',
            'created_at' => now(),
        ]);

        try {
            $result = $this->stkService->handleCallback($payload);
            $cb->update(['processing_status' => 'processed', 'processed_at' => now()]);

            return response()->json([
                'ResultCode' => 0,
                'ResultDesc' => 'Callback Accepted and Processed',
                'details' => $result,
            ]);
        } catch (Exception $e) {
            $cb->update([
                'processing_status' => 'failed',
                'error_message' => $e->getMessage(),
                'processed_at' => now(),
            ]);

            return response()->json([
                'ResultCode' => 0,
                'ResultDesc' => 'Callback Logged for Investigation: ' . $e->getMessage(),
            ]);
        }
    }

    public function handleC2bValidation(Request $request): JsonResponse
    {
        $billRef = $request->input('BillRefNumber');
        $transAmount = $request->input('TransAmount');

        $order = Order::where('order_number', $billRef)->first();

        if (!$order) {
            // Safaricom protocol reject: 1
            return response()->json([
                'ResultCode' => 'C2B00011',
                'ResultDesc' => 'Invalid Order BillRefNumber',
            ]);
        }

        if (round((float) $transAmount, 2) < round((float) $order->grand_total, 2)) {
            return response()->json([
                'ResultCode' => 'C2B00012',
                'ResultDesc' => 'Underpayment: TransAmount is less than Order Total',
            ]);
        }

        // Accept transaction
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Validation Accepted',
        ]);
    }

    public function handleC2bConfirmation(Request $request): JsonResponse
    {
        $data = $request->all();
        $billRef = $data['BillRefNumber'] ?? null;
        $transId = $data['TransID'] ?? null;
        $amount = (float) ($data['TransAmount'] ?? 0);

        $order = Order::where('order_number', $billRef)->first();

        if ($order) {
            $paymentId = (string) Str::uuid();
            $payment = Payment::create([
                'id' => $paymentId,
                'payment_number' => 'PAY-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                'order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'provider' => 'mpesa',
                'method' => 'c2b_paybill',
                'amount' => $amount,
                'currency' => 'KES',
                'status' => 'paid',
                'provider_transaction_id' => $transId,
                'paid_at' => now(),
            ]);

            $order->update([
                'status' => 'PAYMENT_CONFIRMED',
                'payment_status' => 'paid',
            ]);

            // Double-entry ledger settlement
            $sellerSplits = [];
            foreach ($order->sellerOrders as $so) {
                $sellerSplits[] = [
                    'seller_id' => $so->seller_id,
                    'net_amount' => $so->seller_net_payout,
                ];
            }

            $commissionTotal = $order->sellerOrders->sum('commission_total');
            $this->ledgerService->postOrderPayment(
                orderId: $order->id,
                grandTotal: $order->grand_total,
                sellerSplits: $sellerSplits,
                commissionTotal: $commissionTotal,
                deliveryFee: $order->delivery_fee
            );
        }

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Confirmation Processed Successfully',
        ]);
    }

    public function handleB2cResult(Request $request): JsonResponse
    {
        $data = $request->all();
        $result = $data['Result'] ?? [];
        $conversationId = $result['ConversationID'] ?? null;
        $resultCode = $result['ResultCode'] ?? 1;

        $payout = Payout::where('id', $conversationId)
            ->orWhere('payout_number', $conversationId)
            ->first();

        if ($payout) {
            if ($resultCode === 0) {
                $payout->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
            } else {
                $payout->update([
                    'status' => 'failed',
                    'failure_reason' => $result['ResultDesc'] ?? 'B2C Failure',
                ]);
            }
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'B2C Result Handled']);
    }

    public function handleB2cTimeout(Request $request): JsonResponse
    {
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Timeout Logged']);
    }

    public function handleTransactionStatus(Request $request): JsonResponse
    {
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Status Callback Handled']);
    }
}
