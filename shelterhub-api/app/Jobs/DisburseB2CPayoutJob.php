<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Payout;
use App\Models\SellerPayoutAccount;
use App\Integrations\Mpesa\MpesaClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class DisburseB2CPayoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        protected string $payoutId
    ) {}

    public function handle(MpesaClient $mpesaClient): void
    {
        // Claim the payout once before the external call. A duplicate queue delivery
        // must not submit a second B2C transfer while the first outcome is unknown.
        $payout = DB::transaction(function (): ?Payout {
            $locked = Payout::whereKey($this->payoutId)->lockForUpdate()->first();
            if (!$locked || !(
                $locked->status === 'approved'
                || ($locked->status === 'processing' && in_array($locked->provider_status, [null, 'queued'], true))
            )) {
                return null;
            }

            $locked->update([
                'status' => 'processing',
                'provider' => 'mpesa',
                'provider_status' => 'dispatching',
            ]);
            return $locked->load('seller.user');
        });

        if (!$payout) {
            return;
        }

        // 1. Resolve seller M-Pesa phone number
        $payoutAccount = SellerPayoutAccount::where('seller_id', $payout->seller_id)
            ->where('type', 'mpesa')
            ->where('verification_status', 'verified')
            ->orderByDesc('is_primary')
            ->first();

        $phone = $payoutAccount?->mpesa_number ?: $payoutAccount?->account_number;
        if (empty($phone)) {
            $payout->update([
                'status' => 'failed',
                'failure_reason' => 'No verified M-Pesa payout phone number found for seller.',
            ]);
            return;
        }

        $providerEnvironment = config('shelterhub.mpesa.env');
        $hasCredentials = !empty(config('shelterhub.mpesa.consumer_key'))
            && !empty(config('shelterhub.mpesa.consumer_secret'))
            && !empty(config('shelterhub.mpesa.b2c_shortcode'))
            && !empty(config('shelterhub.mpesa.b2c_initiator'))
            && !empty(config('shelterhub.mpesa.b2c_security_credential'));

        $dispatchAttempted = false;

        try {
            if (!in_array($providerEnvironment, ['sandbox', 'production'], true)) {
                throw new RuntimeException('Unsupported M-Pesa environment.');
            }
            if (app()->environment('production') && $providerEnvironment !== 'production') {
                throw new RuntimeException('Production payouts require the production M-Pesa environment.');
            }
            if ($providerEnvironment === 'production' && !app()->environment('production')) {
                throw new RuntimeException('Production M-Pesa credentials cannot be used outside production.');
            }
            if (!$hasCredentials) {
                throw new RuntimeException('M-Pesa B2C credentials are not configured.');
            }

            $amount = (string) $payout->getRawOriginal('amount');
            if (!is_numeric($amount) || bccomp($amount, bcadd($amount, '0', 0), 2) !== 0) {
                throw new RuntimeException('M-Pesa B2C payouts must be whole-shilling amounts.');
            }

            $dispatchAttempted = true;
            $response = $mpesaClient->sendB2cPayment(
                phone: $phone,
                amount: $amount,
                remarks: "ShelterHub Payout {$payout->payout_number}",
                occasion: 'Seller Payout'
            );

            $conversationId = $response['ConversationID'] ?? null;
            $originatorConversationId = $response['OriginatorConversationID'] ?? null;
            if (!$conversationId || !$originatorConversationId) {
                $payout->update([
                    'status' => 'timeout_pending_reconciliation',
                    'provider' => 'mpesa',
                    'provider_status' => 'unknown',
                    'provider_requested_at' => now(),
                    'failure_reason' => 'Provider accepted the request without returning reconciliation identifiers.',
                ]);
                return;
            }

            $payout->update([
                'provider' => 'mpesa',
                'provider_conversation_id' => $conversationId,
                'provider_request_id' => $originatorConversationId,
                'provider_status' => 'submitted',
                'provider_requested_at' => now(),
            ]);
        } catch (Throwable $e) {
            $status = $dispatchAttempted
                ? 'timeout_pending_reconciliation'
                : 'failed';
            Log::error("B2C payout dispatch failed for payout {$payout->id}.", [
                'exception' => $e::class,
                'status' => $status,
                'provider' => $dispatchAttempted ? 'mpesa' : $payout->provider,
                'provider_status' => $dispatchAttempted ? 'unknown' : 'not_submitted',
                'provider_requested_at' => $dispatchAttempted ? now() : $payout->provider_requested_at,
            ]);
            $payout->update([
                'status' => $status,
                'provider' => $dispatchAttempted ? 'mpesa' : $payout->provider,
                'provider_status' => $dispatchAttempted ? 'unknown' : 'not_submitted',
                'provider_requested_at' => $dispatchAttempted ? now() : null,
                'failure_reason' => $status === 'failed'
                    ? 'Provider dispatch could not be started.'
                    : 'Provider outcome is ambiguous; verify transaction status before retrying.',
            ]);
        }
    }
}
