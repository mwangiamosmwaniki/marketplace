<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\IdempotencyKey;
use Illuminate\Support\Str;
use Throwable;

class IdempotencyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');

        if (!$idempotencyKey || !$request->isMethod('POST')) {
            return $next($request);
        }

        if (!is_string($idempotencyKey) || strlen($idempotencyKey) > 255) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_IDEMPOTENCY_KEY',
                    'message' => 'Idempotency-Key must be a string no longer than 255 characters.',
                ],
            ], 422);
        }

        $userId = $request->user()?->id;
        $requestPath = $request->path();
        $requestHash = hash('sha256', $requestPath . '|' . json_encode(
            $request->except('idempotency_key'),
            JSON_THROW_ON_ERROR
        ));
        DB::table('idempotency_keys')
            ->where('user_id', $userId)
            ->where('idempotency_key', $idempotencyKey)
            ->where('request_path', $requestPath)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->delete();

        $recordId = (string) Str::uuid();
        $claimed = DB::table('idempotency_keys')->insertOrIgnore([
            'id' => $recordId,
            'user_id' => $userId,
            'idempotency_key' => $idempotencyKey,
            'request_path' => $requestPath,
            'request_hash' => $requestHash,
            'response_code' => null,
            'response_body' => null,
            'created_at' => now(),
            'expires_at' => now()->addHours(24),
        ]);

        if ($claimed !== 1) {
            $existing = IdempotencyKey::where('user_id', $userId)
                ->where('idempotency_key', $idempotencyKey)
                ->where('request_path', $requestPath)
                ->first();

            if (!$existing || !hash_equals($existing->request_hash, $requestHash)) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
                        'message' => 'This idempotency key was already used for a different request body on the same endpoint.',
                    ],
                ], 422);
            }

            if ($existing->response_body !== null) {
                return response()->json(
                    $existing->response_body,
                    (int) ($existing->response_code ?? 200)
                )->header('X-Cache-Lookup', 'IDEMPOTENT_REPLAY');
            }

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'IDEMPOTENCY_KEY_PROCESSING',
                    'message' => 'This request is already being processed. Please retry once the original request completes.',
                ],
            ], 409);
        }

        $request->attributes->set('idempotency_key_record_id', $recordId);

        try {
            $response = $next($request);

            if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
                $content = json_decode($response->getContent(), true);
                IdempotencyKey::whereKey($recordId)
                    ->whereNull('response_body')
                    ->update([
                    'response_code' => $response->getStatusCode(),
                    'response_body' => json_encode($content, JSON_THROW_ON_ERROR),
                    'expires_at' => now()->addHours(24),
                ]);
            } else {
                DB::table('idempotency_keys')->where('id', $recordId)->delete();
            }

            return $response;
        } catch (Throwable $exception) {
            DB::table('idempotency_keys')
                ->where('id', $recordId)
                ->whereNull('response_body')
                ->delete();
            throw $exception;
        }
    }
}
