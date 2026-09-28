<?php

namespace App\Domain\Finance\Services;

use App\Models\Refund;
use App\Models\Payment;
use App\Integrations\Mpesa\MpesaClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Refund Processor Service
 * Executes real customer refund disbursement via Safaricom Daraja Reversal API / B2C payout,
 * and only books the double-entry general ledger entry upon gateway confirmation.
 */
class RefundProcessorService
{
    public function __construct(
        protected MpesaClient $mpesaClient,
        protected LedgerPostingService $ledgerService
    ) {}

    /**
     * Dispatches real refund disbursement.
     */
    public function processRefund(string $refundId): array
    {
        $refund = Refund::with(['order', 'payment', 'customer'])->findOrFail($refundId);

        if ($refund->status !== 'approved') {
            throw new Exception("Refund cannot be disbursed unless approved. Current status: {$refund->status}");
        }

        $payment = $refund->payment;
        $amount = (float) $refund->amount;
        $providerEnvironment = config('kesales.mpesa.env');
        $hasCredentials = !empty(config('kesales.mpesa.consumer_key'))
            && !empty(config('kesales.mpesa.consumer_secret'))
            && !empty(config('kesales.mpesa.b2c_shortcode'))
            && !empty(config('kesales.mpesa.b2c_initiator'))
            && !empty(config('kesales.mpesa.b2c_security_credential'));

        $refund->update(['status' => 'processing']);

        $dispatchAttempted = false;
        $providerAccepted = false;
        $providerRejected = false;

        try {
            if (!in_array($providerEnvironment, ['sandbox', 'production'], true)) {
                throw new RuntimeException('Unsupported M-Pesa environment.');
            }
            if (app()->environment('production') && $providerEnvironment !== 'production') {
                throw new RuntimeException('Production refunds require the production M-Pesa environment.');
            }
            if ($providerEnvironment === 'production' && !app()->environment('production')) {
                throw new RuntimeException('Production M-Pesa credentials cannot be used outside production.');
            }
            if (!$hasCredentials || !$payment || $payment->provider !== 'mpesa' || empty($payment->provider_transaction_id)) {
                throw new RuntimeException('A verified M-Pesa payment and configured provider credentials are required.');
            }

            $token = $this->mpesaClient->getAccessToken();
            $payload = [
                'Initiator' => config('kesales.mpesa.b2c_initiator'),
                'SecurityCredential' => config('kesales.mpesa.b2c_security_credential'),
                'CommandID' => 'TransactionReversal',
                'TransactionID' => $payment->provider_transaction_id,
                'Amount' => (int) round($amount),
                'ReceiverParty' => $this->mpesaClient->getShortcode(),
                'RecieverIdentifierType' => '11',
                'ResultURL' => config('kesales.mpesa.b2c_result_url'),
                'QueueTimeOutURL' => config('kesales.mpesa.b2c_timeout_url'),
                'Remarks' => "Refund for Order {$refund->order?->order_number}",
                'Occasion' => 'Customer Return Refund',
            ];

            $dispatchAttempted = true;
            $response = Http::withToken($token)
                ->timeout(15)
                ->post($this->mpesaClient->baseUrl() . '/mpesa/reversal/v1/request', $payload);

            if ($response->failed()) {
                $providerRejected = true;
                throw new RuntimeException('M-Pesa rejected the refund reversal request.');
            }

            $providerAccepted = true;
            $providerResponse = $response->json();
            $conversationId = $providerResponse['ConversationID'] ?? null;
            $originatorConversationId = $providerResponse['OriginatorConversationID'] ?? null;
            if (!$conversationId || !$originatorConversationId) {
                $refund->update([
                    'status' => 'timeout_pending_reconciliation',
                    'failure_reason' => 'Provider accepted the request without returning reconciliation identifiers.',
                ]);
                return ['success' => true, 'status' => 'timeout_pending_reconciliation'];
            }

            $refund->update([
                'status' => 'provider_pending',
                'provider_conversation_id' => $conversationId,
                'provider_request_id' => $originatorConversationId,
            ]);

            return ['success' => true, 'status' => 'provider_pending'];
        } catch (Throwable $e) {
            $status = $providerRejected || !$dispatchAttempted
                ? 'failed'
                : 'timeout_pending_reconciliation';
            $refund->update([
                'status' => $status,
                'failure_reason' => $status === 'failed'
                    ? 'Provider rejected the request or dispatch could not be started.'
                    : 'Provider outcome is ambiguous; verify transaction status before retrying.',
            ]);
            Log::error("Refund dispatch failed for refund {$refund->id}.", [
                'exception' => $e::class,
                'status' => $status,
            ]);
            if ($status === 'failed') {
                throw new RuntimeException('Refund provider dispatch failed.');
            }

            return ['success' => true, 'status' => $status];
        }
    }
}
