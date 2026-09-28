<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class HealthController
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'app' => 'ok',
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
        ];

        $healthy = !in_array('error', $checks, true);

        return response()->json([
            'success' => $healthy,
            'status' => $healthy ? 'ok' : 'degraded',
            'service' => 'kesales-api',
            'timestamp' => now()->toISOString(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    private function checkDatabase(): string
    {
        try {
            DB::select('SELECT 1');
            return 'ok';
        } catch (Throwable) {
            return 'error';
        }
    }

    private function checkRedis(): string
    {
        try {
            Redis::connection('default')->ping();
            return 'ok';
        } catch (Throwable) {
            return 'error';
        }
    }

    private function checkQueue(): string
    {
        try {
            $driver = config('queue.default');

            if ($driver === 'redis') {
                Redis::connection('default')->ping();
            } elseif ($driver === 'database') {
                $table = config('queue.connections.database.table', 'jobs');
                if (!Schema::hasTable($table)) {
                    return 'error';
                }
            }

            return 'ok';
        } catch (Throwable) {
            return 'error';
        }
    }

    private function checkStorage(): string
    {
        $path = storage_path('framework/health-'.Str::uuid().'.tmp');

        try {
            if (file_put_contents($path, 'ok', LOCK_EX) === false) {
                return 'error';
            }

            return file_get_contents($path) === 'ok' ? 'ok' : 'error';
        } catch (Throwable) {
            return 'error';
        } finally {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
