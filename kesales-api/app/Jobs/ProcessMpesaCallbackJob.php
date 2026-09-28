<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Integrations\Mpesa\StkPushService;

class ProcessMpesaCallbackJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(
        protected array $callbackPayload
    ) {}

    public function handle(StkPushService $stkService): void
    {
        $stkService->handleCallback($this->callbackPayload);
    }
}
