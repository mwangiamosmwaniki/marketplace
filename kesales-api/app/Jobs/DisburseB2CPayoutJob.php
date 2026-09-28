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
use App\Domain\Finance\Services\LedgerPostingService;
use Illuminate\Support\Facades\Log;
use Exception;

class DisburseB2CPayoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        protected string $payoutId
    ) {}

    public function handle(MpesaClient $mpesaClient, LedgerPostingService $ledgerService): void
    {
        $payout = Payout::with('seller.user')->find($this->payoutId);
        if (!$payout || !in_array($payout->status, ['approved', 'processing'])) {
            return;
        }

        // 1. Resolve seller M-Pesa phone number
        $payoutAccount = SellerPayoutAccount::where('seller_id', $payout->seller_id)
            ->where('account_type', 'mpesa')
            ->where('is_verified', true)
            ->first();

        $phone = $payoutAccount?->account_number ?? $payout->seller?->user?->phone;
        if (empty($phone)) {
            $payout->update([
                'status' => 'failed',
                'failure_reason' => 'No verified M-Pesa payout phone number found for seller.',
            ]);
            return;
        }

        $payout->update(['status' => 'processing']);

        $isProduction = config('kesales.mpesa.env') === 'production';
        $hasCredentials = !empty(config('kesales.mpesa.b2c_initiator')) && !empty(config('kesales.mpesa.b2c_security_credential'));

        try {
            if ($isProduction || $hasCredentials) {
                // Real Daraja B2C Call
                $res = $mpesaClient->sendB2cPayment(
                    phone: $phone,
                    amount: (float) $payout->amount,
                    remarks: "KESALES Payout {$payout->payout_number}",
                    occasion: "Seller Payout"
                );

                $conversationId = $res['ConversationID'] ?? null;
                $originatorConversationId = $res['OriginatorConversationID'] ?? null;

                $payout->update([
                    'provider' => 'mpesa',
                    'provider_conversation_id' => $conversationId,
                    'provider_request_id' => $originatorConversationId,
                    'notes' => json_encode([
                        'conversation_id' => $conversationId,
                        'originator_conversation_id' => $originatorConversationId,
                        'response' => $res,
                    ]),
                ]);

                // In live production, final status and ledger posting await the B2C webhook (handleB2cResult)
            } else {
                // Sandbox/Dev Simulation Mode
                $simulatedTxId = 'B2C' . strtoupper(substr(md5((string) microtime()), 0, 10));
                
                // Directly post to ledger in dev/sandbox simulation
                $ledgerService->postSellerPayout(
                    payoutId: $payout->id,
                    sellerId: $payout->seller_id,
                    amount: (float) $payout->amount
                );

                $payout->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'notes' => json_encode([
                        'simulated_transaction_id' => $simulatedTxId,
                        'mode' => 'sandbox_simulated',
                    ]),
                ]);
            }
        } catch (Exception $e) {
            Log::error("B2C Payout dispatch failed for payout {$payout->id}: " . $e->getMessage());
            $payout->update([
                'status' => 'failed',
                'failure_reason' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
