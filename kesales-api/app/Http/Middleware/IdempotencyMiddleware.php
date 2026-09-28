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
        $requestHash = md5($request->path() . '|' . json_encode($request->all()));

        // Look for existing idempotency record
        $record = IdempotencyKey::where('user_id', $userId)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($record && $record->response_body) {
            return response()->json(
                $record->response_body,
                $record->response_code ?? 200
            )->header('X-Cache-Lookup', 'IDEMPOTENT_REPLAY');
        }

        $response = $next($request);

        // Only cache successful JSON responses
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $content = json_decode($response->getContent(), true);

            IdempotencyKey::updateOrCreate(
                [
                    'user_id' => $userId,
                    'idempotency_key' => $idempotencyKey,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'request_path' => $request->path(),
                    'request_hash' => $requestHash,
                    'response_code' => $response->getStatusCode(),
                    'response_body' => $content,
                    'expires_at' => now()->addHours(24),
                ]
            );
        }

        return $response;
    }
}
