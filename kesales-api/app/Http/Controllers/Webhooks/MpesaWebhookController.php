<?php

namespace App\Http\Controllers\Webhooks;

use App\Jobs\ProcessMpesaCallbackJob;
use App\Models\MpesaCallback;
use App\Models\Payment;
use App\Models\Order;
use App\Models\Payout;
use App\Domain\Finance\Services\LedgerPostingService;
use App\Domain\Inventory\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class MpesaWebhookController extends BaseController
{
    public function __construct(
        protected LedgerPostingService $ledgerService,
        protected InventoryService $inventoryService
    ) {}

    /**
     * Async STK Push Webhook Handler
     * 1. Persists raw callback immediately
     * 2. Returns 200 OK fast to Safaricom Daraja
     * 3. Dispatches ProcessMpesaCallbackJob to Horizon queue
     */
    public function handleStkCallback(Request $request): JsonResponse
    {
        $payload = $request->all();
        $checkoutReqId = $payload['Body']['stkCallback']['CheckoutRequestID'] ?? null;

        MpesaCallback::create([
            'id' => (string) Str::uuid(),
            'event_type' => 'mpesa.stk_callback',
            'checkout_request_id' => $checkoutReqId,
            'payload' => $payload,
            'processing_status' => 'queued',
            'created_at' => now(),
        ]);

        // Dispatch background processing job to Horizon
        ProcessMpesaCallbackJob::dispatch($payload);

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Callback received and queued for asynchronous settlement',
        ]);
    }

    public function handleC2bValidation(Request $request): JsonResponse
    {
        $billRef = $request->input('BillRefNumber');
        $transAmount = $request->input('TransAmount');

        $order = Order::where('order_number', $billRef)->first();

        if (!$order) {
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

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Validation Accepted',
        ]);
    }

    /**
     * Strictly Idempotent C2B Confirmation Handler
     * Enforces TransID uniqueness to prevent duplicate payments or duplicate ledger journals.
     */
    public function handleC2bConfirmation(Request $request): JsonResponse
    {
        $data = $request->all();
        $billRef = $data['BillRefNumber'] ?? null;
        $transId = $data['TransID'] ?? null;
        $amount = (float) ($data['TransAmount'] ?? 0);

        if (!$transId) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Missing TransID']);
        }

        // 1. Idempotency Check on Provider Transaction ID
        $existing = Payment::where('provider_transaction_id', $transId)->first();
        if ($existing) {
            return response()->json([
                'ResultCode' => 0,
                'ResultDesc' => 'Duplicate callback ignored; transaction already settled',
            ]);
        }

        $order = Order::with('sellerOrders')->where('order_number', $billRef)->first();

        if ($order) {
            DB::transaction(function () use ($order, $transId, $amount, $data) {
                // Double-check with lock inside transaction
                $lockedPayment = Payment::where('provider_transaction_id', $transId)->lockForUpdate()->first();
                if ($lockedPayment) {
                    return;
                }

                $payment = Payment::create([
                    'id' => (string) Str::uuid(),
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
                    'metadata' => $data,
                ]);

                $order->update([
                    'status' => 'PAYMENT_CONFIRMED',
                    'payment_status' => 'paid',
                ]);

                // Commit reserved inventory to permanent sale
                $orderItems = DB::table('order_items')->where('order_id', $order->id)->get();
                foreach ($orderItems as $item) {
                    $this->inventoryService->commitStockSale($item->variant_id, $item->quantity, $order->id);
                }

                // Double-entry ledger settlement
                $sellerSplits = [];
                foreach ($order->sellerOrders as $so) {
                    $sellerSplits[] = [
                        'seller_id' => $so->seller_id,
                        'net_amount' => (float) $so->seller_net_payout,
                    ];
                }

                $commissionTotal = (float) $order->sellerOrders->sum('commission_total');
                $this->ledgerService->postOrderPayment(
                    orderId: $order->id,
                    grandTotal: (float) $order->grand_total,
                    sellerSplits: $sellerSplits,
                    commissionTotal: $commissionTotal,
                    deliveryFee: (float) $order->delivery_fee
                );
            });
        }

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Confirmation Processed Successfully',
        ]);
    }

    /**
     * B2C Payout Result Webhook from Safaricom:
     * Only posts to financial ledger after Safaricom explicitly confirms success (ResultCode === 0).
     */
    public function handleB2cResult(Request $request): JsonResponse
    {
        $data = $request->all();
        $result = $data['Result'] ?? [];
        $conversationId = $result['ConversationID'] ?? null;
        $originatorConversationId = $result['OriginatorConversationID'] ?? null;
        $resultCode = $result['ResultCode'] ?? 1;
        $transactionId = $result['TransactionID'] ?? null;

        $payout = Payout::where('id', $conversationId)
            ->orWhere('payout_number', $conversationId)
            ->orWhere('payout_number', $originatorConversationId)
            ->first();

        if ($payout) {
            DB::transaction(function () use ($payout, $resultCode, $result, $transactionId) {
                $lockedPayout = Payout::where('id', $payout->id)->lockForUpdate()->first();
                if ($lockedPayout->status === 'completed') {
                    return; // Already finalized
                }

                if ($resultCode === 0) {
                    // 1. Post to double-entry general ledger upon confirmed Safaricom disbursement
                    $this->ledgerService->postSellerPayout(
                        payoutId: $lockedPayout->id,
                        sellerId: $lockedPayout->seller_id,
                        amount: (float) $lockedPayout->amount
                    );

                    $lockedPayout->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);
                } else {
                    $lockedPayout->update([
                        'status' => 'failed',
                        'failure_reason' => $result['ResultDesc'] ?? 'B2C Gateway Rejection',
                    ]);
                }
            });
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
