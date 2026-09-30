<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\IdempotencyKey;
use Illuminate\Support\Str;

class IdempotencyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');

        if (!$idempotencyKey || !$request->isMethod('POST')) {
            return $next($request);
        }

        $userId = $request->user()?->id;
        $requestPath = $request->path();
        $requestHash = hash('sha256', $requestPath . '|' . json_encode($request->all(), JSON_THROW_ON_ERROR));

        $existing = IdempotencyKey::where('user_id', $userId)
            ->where('idempotency_key', $idempotencyKey)
            ->where('request_path', $requestPath)
            ->first();

        if ($existing) {
            if ($existing->request_hash !== $requestHash) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
                        'message' => 'This idempotency key was already used for a different request body on the same endpoint.',
                    ],
                ], 422);
            }

            if (!empty($existing->response_body)) {
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

        $record = IdempotencyKey::create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'idempotency_key' => $idempotencyKey,
            'request_path' => $requestPath,
            'request_hash' => $requestHash,
            'response_code' => null,
            'response_body' => null,
            'created_at' => now(),
            'expires_at' => now()->addHours(24),
        ]);

        $response = $next($request);

        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $content = json_decode($response->getContent(), true);
            $record->forceFill([
                'response_code' => $response->getStatusCode(),
                'response_body' => $content,
                'expires_at' => now()->addHours(24),
            ])->save();
        }

        return $response;
    }
}
