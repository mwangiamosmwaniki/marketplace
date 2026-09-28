<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Payout;
use App\Domain\Finance\Services\LedgerPostingService;

class DisburseB2CPayoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        protected string $payoutId
    ) {}

    public function handle(LedgerPostingService $ledgerService): void
    {
        $payout = Payout::find($this->payoutId);
        if ($payout && $payout->status === 'approved') {
            $ledgerService->postSellerPayout(
                payoutId: $payout->id,
                sellerId: $payout->seller_id,
                amount: (float) $payout->amount
            );

            $payout->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }
    }
}
