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
    public function processRefund(string $refundId, ?string $actorId = null): array
    {
        $refund = DB::transaction(function () use ($refundId, $actorId): Refund {
            $locked = Refund::whereKey($refundId)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'approved') {
                throw new RuntimeException("Refund cannot be disbursed unless approved. Current status: {$locked->status}");
            }
            if ($actorId !== null && (string) $locked->approved_by === $actorId) {
                throw new RuntimeException('Refund approval and processing must be performed by different finance users.');
            }

            $locked->update([
                'status' => 'processing',
                'provider_status' => 'initiating',
            ]);

            return $locked->load(['order', 'payment', 'customer']);
        });

        $payment = $refund->payment;
        $amount = (string) $refund->getRawOriginal('amount');
        $providerEnvironment = config('shelterhub.mpesa.env');
        $hasCredentials = !empty(config('shelterhub.mpesa.consumer_key'))
            && !empty(config('shelterhub.mpesa.consumer_secret'))
            && !empty(config('shelterhub.mpesa.b2c_shortcode'))
            && !empty(config('shelterhub.mpesa.b2c_initiator'))
            && !empty(config('shelterhub.mpesa.b2c_security_credential'));

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

            if (!is_numeric($amount) || bccomp($amount, bcadd($amount, '0', 0), 2) !== 0) {
                throw new RuntimeException('M-Pesa refunds must be whole-shilling amounts.');
            }

            $token = $this->mpesaClient->getAccessToken();
            $payload = [
                'Initiator' => config('shelterhub.mpesa.b2c_initiator'),
                'SecurityCredential' => config('shelterhub.mpesa.b2c_security_credential'),
                'CommandID' => 'TransactionReversal',
                'TransactionID' => $payment->provider_transaction_id,
                'Amount' => (int) $amount,
                'ReceiverParty' => $this->mpesaClient->getShortcode(),
                'RecieverIdentifierType' => '11',
                'ResultURL' => config('shelterhub.mpesa.b2c_result_url'),
                'QueueTimeOutURL' => config('shelterhub.mpesa.b2c_timeout_url'),
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
                    'provider_status' => 'unknown',
                    'provider_requested_at' => now(),
                    'failure_reason' => 'Provider accepted the request without returning reconciliation identifiers.',
                ]);
                return ['success' => true, 'status' => 'timeout_pending_reconciliation'];
            }

            $refund->update([
                'status' => 'provider_pending',
                'provider_status' => 'submitted',
                'provider_conversation_id' => $conversationId,
                'provider_request_id' => $originatorConversationId,
                'provider_requested_at' => now(),
            ]);

            return ['success' => true, 'status' => 'provider_pending'];
        } catch (Throwable $e) {
            $status = $providerRejected || !$dispatchAttempted
                ? 'failed'
                : 'timeout_pending_reconciliation';
            $refund->update([
                'status' => $status,
                'provider_status' => $dispatchAttempted ? 'unknown' : 'not_submitted',
                'provider_requested_at' => $dispatchAttempted ? now() : null,
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
