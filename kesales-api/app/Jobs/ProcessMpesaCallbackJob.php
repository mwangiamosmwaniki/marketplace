<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Integrations\Mpesa\StkPushService;
use App\Models\MpesaCallback;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class ProcessMpesaCallbackJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 8;
    public int $timeout = 60;
    public array $backoff = [30, 60, 120, 300, 600];

    public function __construct(
        public string $callbackId
    ) {}

    public function handle(StkPushService $stkService): void
    {
        $payload = DB::transaction(function () {
            $callback = MpesaCallback::whereKey($this->callbackId)->lockForUpdate()->first();
            if (!$callback || $callback->processing_status === 'processed') {
                return null;
            }

            if ($callback->processing_status === 'processing'
                && $callback->processing_started_at?->isAfter(now()->subMinutes(5))) {
                return false;
            }

            $callback->forceFill([
                'processing_status' => 'processing',
                'attempts' => $callback->attempts + 1,
                'processing_started_at' => now(),
                'error_message' => null,
            ])->save();

            return $callback->payload;
        });

        if ($payload === null) {
            return;
        }
        if ($payload === false) {
            $this->release(30);
            return;
        }

        try {
            $result = $stkService->handleCallback($payload);
            if ($result['status'] === 'failed' && $result['reason'] === 'transaction_not_found') {
                throw new RuntimeException('M-Pesa transaction is not available for this callback yet.');
            }

            MpesaCallback::whereKey($this->callbackId)->update([
                'processing_status' => 'processed',
                'processing_started_at' => null,
                'processed_at' => now(),
                'error_message' => null,
            ]);
        } catch (Throwable $exception) {
            $callback = MpesaCallback::find($this->callbackId);
            $isFinalAttempt = ($callback?->attempts ?? $this->attempts()) >= $this->tries;
            MpesaCallback::whereKey($this->callbackId)->update([
                'processing_status' => $isFinalAttempt ? 'failed' : 'queued',
                'processing_started_at' => null,
                'failed_at' => $isFinalAttempt ? now() : null,
                'error_message' => mb_substr($exception->getMessage(), 0, 2000),
            ]);

            throw $exception;
        }
    }
}
