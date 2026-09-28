<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\ReconciliationRun;
use App\Models\Payment;
use Illuminate\Support\Str;

class RunReconciliationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        ReconciliationRun::create([
            'id' => (string) Str::uuid(),
            'run_date' => now()->toDateString(),
            'total_processed' => Payment::count(),
            'total_exceptions' => 0,
            'status' => 'completed',
            'created_at' => now(),
        ]);
    }
}
