<?php

namespace App\Http\Controllers\Webhooks;

use App\Jobs\ProcessMpesaCallbackJob;
use App\Models\Payment;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Refund;
use App\Domain\Finance\Services\LedgerPostingService;
use App\Domain\Finance\Services\PaymentSettlementService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Routing\Controller as BaseController;

class MpesaWebhookController extends BaseController
{
    public function __construct(
        protected LedgerPostingService $ledgerService,
        protected PaymentSettlementService $paymentSettlementService
    ) {}

    public function handleStkCallback(Request $request): JsonResponse
    {
        $payload = $request->all();
        $checkoutReqId = $payload['Body']['stkCallback']['CheckoutRequestID'] ?? null;
        $callbackId = (string) Str::uuid();
        $inserted = DB::table('mpesa_callbacks')->insertOrIgnore([
            'id' => $callbackId,
            'event_type' => 'mpesa.stk_callback',
            'provider_event_id' => $checkoutReqId,
            'payload_hash' => hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)),
            'checkout_request_id' => $checkoutReqId,
            'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'processing_status' => 'queued',
            'attempts' => 0,
            'received_at' => now(),
            'created_at' => now(),
        ]);

        if ($inserted === 1) {
            ProcessMpesaCallbackJob::dispatch($callbackId);
        }

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => $inserted === 1
                ? 'Callback received and queued for asynchronous settlement'
                : 'Duplicate callback already received',
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

        if (!is_numeric((string) $transAmount)
            || bccomp((string) $transAmount, (string) $order->getRawOriginal('grand_total'), 2) !== 0) {
            return response()->json([
                'ResultCode' => 'C2B00012',
                'ResultDesc' => 'TransAmount must exactly match the Order Total',
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
        $amount = (string) ($data['TransAmount'] ?? '0.00');

        if (!$transId || !is_numeric($amount)) {
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
            if (bccomp($amount, (string) $order->getRawOriginal('grand_total'), 2) !== 0) {
                return response()->json([
                    'ResultCode' => 1,
                    'ResultDesc' => 'Provider amount does not match the order total',
                ]);
            }

            try {
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
                    'status' => 'initiated',
                    'metadata' => $data,
                ]);

                $this->paymentSettlementService->settleSuccessfulPayment(
                    paymentId: $payment->id,
                    providerTransactionId: $transId,
                    providerAmount: $amount
                );
                });
            } catch (QueryException $exception) {
                if (!Payment::where('provider', 'mpesa')->where('provider_transaction_id', $transId)->exists()) {
                    throw $exception;
                }

                return response()->json([
                    'ResultCode' => 0,
                    'ResultDesc' => 'Duplicate provider transaction ignored',
                ]);
            }
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

        $payout = null;
        if ($conversationId || $originatorConversationId) {
            $payout = Payout::where(function ($query) use ($conversationId, $originatorConversationId) {
                if ($conversationId) {
                    $query->where('provider_conversation_id', $conversationId)
                        ->orWhere('id', $conversationId)
                        ->orWhere('payout_number', $conversationId);
                }
                if ($originatorConversationId) {
                    $method = $conversationId ? 'orWhere' : 'where';
                    $query->{$method}('provider_request_id', $originatorConversationId);
                }
            })->first();
        }

        if ($payout) {
            DB::transaction(function () use ($payout, $resultCode, $result, $transactionId) {
                $lockedPayout = Payout::where('id', $payout->id)->lockForUpdate()->first();
                $targetStatus = ((int) $resultCode === 0 && $transactionId) ? 'completed' : 'failed';
                if (!$lockedPayout->canTransitionTo($targetStatus)) {
                    return;
                }

                $providerResult = [
                    'provider_result_code' => (string) $resultCode,
                    'provider_result_message' => (string) ($result['ResultDesc'] ?? ''),
                    'provider_completed_at' => now(),
                ];

                if ($targetStatus === 'completed') {
                    // 1. Post to double-entry general ledger upon confirmed Safaricom disbursement
                    $this->ledgerService->postSellerPayout(
                        payoutId: $lockedPayout->id,
                        sellerId: $lockedPayout->seller_id,
                        amount: (string) $lockedPayout->getRawOriginal('amount')
                    );

                    $lockedPayout->update([
                        ...$providerResult,
                        'status' => 'completed',
                        'provider_status' => 'completed',
                        'provider_transaction_id' => $transactionId,
                        'completed_at' => now(),
                    ]);
                } else {
                    $lockedPayout->update([
                        ...$providerResult,
                        'status' => 'failed',
                        'provider_status' => 'failed',
                        'failure_reason' => $result['ResultDesc'] ?? 'B2C Gateway Rejection',
                    ]);
                }
            });
        } else {
            $refund = null;
            if ($conversationId || $originatorConversationId) {
                $refund = Refund::where(function ($query) use ($conversationId, $originatorConversationId) {
                    if ($conversationId) {
                        $query->where('provider_conversation_id', $conversationId);
                    }
                    if ($originatorConversationId) {
                        $method = $conversationId ? 'orWhere' : 'where';
                        $query->{$method}('provider_request_id', $originatorConversationId);
                    }
                })->first();
            }

            if ($refund) {
                DB::transaction(function () use ($refund, $resultCode, $result, $transactionId) {
                    $lockedRefund = Refund::where('id', $refund->id)->lockForUpdate()->first();
                    $targetStatus = ((int) $resultCode === 0 && $transactionId) ? 'completed' : 'failed';
                    if (!$lockedRefund->canTransitionTo($targetStatus)) {
                        return;
                    }

                    $providerResult = [
                        'provider_result_code' => (string) $resultCode,
                        'provider_result_message' => (string) ($result['ResultDesc'] ?? ''),
                        'provider_completed_at' => now(),
                    ];

                    if ($targetStatus === 'completed') {
                        $this->ledgerService->postCustomerRefund(
                            refundId: $lockedRefund->id,
                            orderId: $lockedRefund->order_id,
                            amount: (string) $lockedRefund->getRawOriginal('amount')
                        );

                        $lockedRefund->update([
                            ...$providerResult,
                            'status' => 'completed',
                            'provider_status' => 'completed',
                            'provider_transaction_id' => $transactionId,
                            'completed_at' => now(),
                        ]);
                    } else {
                        $lockedRefund->update([
                            ...$providerResult,
                            'status' => 'failed',
                            'provider_status' => 'failed',
                            'failure_reason' => $result['ResultDesc'] ?? 'Provider rejected refund.',
                        ]);
                    }
                });
            }
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'B2C Result Handled']);
    }

    public function handleB2cTimeout(Request $request): JsonResponse
    {
        $conversationId = $request->input('ConversationID') ?? $request->input('Result.ConversationID');
        if ($conversationId) {
            $payout = Payout::where(function ($query) use ($conversationId) {
                $query->where('provider_conversation_id', $conversationId)
                    ->orWhere('provider_request_id', $conversationId);
            })->first();
            if ($payout && $payout->status === 'processing') {
                $payout->update([
                    'status' => 'timeout_pending_reconciliation',
                    'failure_reason' => 'Safaricom B2C queue timeout; queued for automatic transaction query.',
                ]);
            }

            $refund = Refund::where(function ($query) use ($conversationId) {
                $query->where('provider_conversation_id', $conversationId)
                    ->orWhere('provider_request_id', $conversationId);
            })->first();
            if ($refund && $refund->status === 'provider_pending') {
                $refund->update([
                    'status' => 'timeout_pending_reconciliation',
                    'failure_reason' => 'Safaricom reversal timeout; provider transaction status requires reconciliation.',
                ]);
            }
        }
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Timeout Logged']);
    }

    public function handleTransactionStatus(Request $request): JsonResponse
    {
        // A status-query response is evidence only. It does not contain a trusted,
        // reliably correlated order/payment amount, so it must never settle a payment.
        // Successful payments are settled through the STK/C2B handlers, which verify
        // the provider amount and invoke PaymentSettlementService atomically.
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Status response received; payment settlement requires a verified payment callback',
        ]);
    }
}
