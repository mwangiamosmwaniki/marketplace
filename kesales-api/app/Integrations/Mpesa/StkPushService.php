<?php

namespace App\Integrations\Mpesa;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Domain\Finance\Services\LedgerPostingService;
use Exception;

/**
 * Safaricom Daraja STK Push (M-Pesa Express) Service
 * Handles STK Prompt triggering, transaction registration, and idempotent callback handling.
 */
class StkPushService
{
    public function __construct(
        protected MpesaClient $client,
        protected LedgerPostingService $ledgerService
    ) {}

    /**
     * Dispatch STK Push Prompt to Customer Handset
     */
    public function initiate(string $orderId, string $phone, float $amount, string $accountReference): array
    {
        $timestamp = date('YmdHis');
        $password = $this->client->generatePassword($timestamp);
        $token = $this->client->getAccessToken();

        // Format phone to 254XXXXXXXXX
        $formattedPhone = preg_replace('/^(?:\+?254|0)?/', '254', trim($phone));

        $payload = [
            'BusinessShortCode' => $this->client->getShortcode(),
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => (int) round($amount),
            'PartyA' => $formattedPhone,
            'PartyB' => $this->client->getShortcode(),
            'PhoneNumber' => $formattedPhone,
            'CallBackURL' => config('kesales.mpesa.stk_callback_url', 'https://api.kesales.ke/webhooks/mpesa/stk'),
            'AccountReference' => substr($accountReference, 0, 12),
            'TransactionDesc' => "KESALES Order {$accountReference}",
        ];

        $response = Http::withToken($token)
            ->post($this->client->baseUrl() . '/mpesa/stkpush/v1/processrequest', $payload);

        if ($response->failed()) {
            throw new Exception("STK Push failed: " . $response->body());
        }

        $resData = $response->json();
        $merchantRequestId = $resData['MerchantRequestID'];
        $checkoutRequestId = $resData['CheckoutRequestID'];

        // Register payment & mpesa transaction records
        $paymentId = Str::uuid()->toString();
        $paymentNumber = 'PAY-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        DB::table('payments')->insert([
            'id' => $paymentId,
            'payment_number' => $paymentNumber,
            'order_id' => $orderId,
            'customer_id' => auth()->id() ?? Str::uuid()->toString(),
            'provider' => 'mpesa',
            'method' => 'stk_push',
            'amount' => $amount,
            'currency' => 'KES',
            'status' => 'initiated',
            'provider_request_id' => $checkoutRequestId,
            'created_at' => now(),
        ]);

        DB::table('mpesa_transactions')->insert([
            'id' => Str::uuid()->toString(),
            'payment_id' => $paymentId,
            'merchant_request_id' => $merchantRequestId,
            'checkout_request_id' => $checkoutRequestId,
            'phone_number' => $formattedPhone,
            'amount' => $amount,
            'raw_request' => json_encode($payload),
            'created_at' => now(),
        ]);

        return [
            'success' => true,
            'payment_id' => $paymentId,
            'checkout_request_id' => $checkoutRequestId,
            'customer_message' => $resData['CustomerMessage'] ?? 'STK prompt dispatched to your phone.',
        ];
    }

    /**
     * Idempotent Callback Processing
     * Safaricom may retry webhooks; this prevents double payments or double ledger postings.
     */
    public function handleCallback(array $body): array
    {
        $stkCallback = $body['Body']['stkCallback'] ?? null;
        if (!$stkCallback) {
            return ['status' => 'ignored', 'reason' => 'invalid_payload'];
        }

        $checkoutRequestId = $stkCallback['CheckoutRequestID'];
        $resultCode = $stkCallback['ResultCode'];
        $resultDesc = $stkCallback['ResultDesc'];

        // 1. Audit raw callback
        DB::table('mpesa_callbacks')->insert([
            'id' => Str::uuid()->toString(),
            'event_type' => 'stk_callback',
            'checkout_request_id' => $checkoutRequestId,
            'payload' => json_encode($body),
            'processing_status' => 'unprocessed',
            'created_at' => now(),
        ]);

        return DB::transaction(function () use ($checkoutRequestId, $resultCode, $resultDesc, $stkCallback, $body) {
            // Find M-Pesa transaction row with lock
            $mpesaTx = DB::table('mpesa_transactions')
                ->where('checkout_request_id', $checkoutRequestId)
                ->lockForUpdate()
                ->first();

            if (!$mpesaTx) {
                return ['status' => 'failed', 'reason' => 'transaction_not_found'];
            }

            // IDEMPOTENCY CHECK: If already processed, exit safely
            if ($mpesaTx->processed_at !== null) {
                return ['status' => 'duplicate', 'message' => 'Callback already settled'];
            }

            $payment = DB::table('payments')->where('id', $mpesaTx->payment_id)->first();
            $order = DB::table('orders')->where('id', $payment->order_id)->first();

            // Check if payment was successful (ResultCode === 0)
            if ($resultCode === 0) {
                $items = $stkCallback['CallbackMetadata']['Item'] ?? [];
                $receipt = null;
                $paidPhone = null;

                foreach ($items as $item) {
                    if ($item['Name'] === 'MpesaReceiptNumber') $receipt = $item['Value'];
                    if ($item['Name'] === 'PhoneNumber') $paidPhone = (string) $item['Value'];
                }

                // 1. Mark M-Pesa transaction settled
                DB::table('mpesa_transactions')
                    ->where('id', $mpesaTx->id)
                    ->update([
                        'mpesa_receipt_number' => $receipt,
                        'result_code' => $resultCode,
                        'result_description' => $resultDesc,
                        'transaction_date' => now(),
                        'raw_response' => json_encode($body),
                        'processed_at' => now(),
                    ]);

                // 2. Mark payment paid
                DB::table('payments')
                    ->where('id', $payment->id)
                    ->update([
                        'status' => 'paid',
                        'provider_transaction_id' => $receipt,
                        'paid_at' => now(),
                    ]);

                // 3. Confirm order
                DB::table('orders')
                    ->where('id', $order->id)
                    ->update([
                        'status' => 'PAYMENT_CONFIRMED',
                        'payment_status' => 'paid',
                        'updated_at' => now(),
                    ]);

                // 4. Double-Entry Financial Ledger Settlement
                $subOrders = DB::table('seller_orders')
                    ->where('order_id', $order->id)
                    ->get();

                $sellerSplits = [];
                $totalCommission = 0;

                foreach ($subOrders as $sub) {
                    $sellerSplits[] = [
                        'seller_id' => $sub->seller_id,
                        'net_amount' => (float) $sub->seller_net_payout,
                    ];
                    $totalCommission += (float) $sub->commission_total;
                }

                $this->ledgerService->postOrderPayment(
                    orderId: $order->id,
                    grandTotal: (float) $order->grand_total,
                    sellerSplits: $sellerSplits,
                    commissionTotal: $totalCommission,
                    deliveryFee: (float) $order->delivery_fee
                );

                return ['status' => 'success', 'receipt' => $receipt];
            } else {
                // Payment cancelled by user / failed
                DB::table('mpesa_transactions')
                    ->where('id', $mpesaTx->id)
                    ->update([
                        'result_code' => $resultCode,
                        'result_description' => $resultDesc,
                        'raw_response' => json_encode($body),
                        'processed_at' => now(),
                    ]);

                DB::table('payments')
                    ->where('id', $payment->id)
                    ->update([
                        'status' => 'failed',
                        'failed_at' => now(),
                    ]);

                return ['status' => 'payment_failed', 'reason' => $resultDesc];
            }
        });
    }
}
