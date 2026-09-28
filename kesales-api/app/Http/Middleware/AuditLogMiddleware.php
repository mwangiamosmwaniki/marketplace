<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\AuditService;

class AuditLogMiddleware
{
    /**
     * Automatically captures modifying administrative and financial actions.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log mutative state operations (POST, PUT, PATCH, DELETE) by authenticated users
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']) && $request->user()) {
            $path = $request->path();
            $module = 'general';

            if (str_contains($path, 'admin/')) $module = 'admin';
            elseif (str_contains($path, 'finance/')) $module = 'finance';
            elseif (str_contains($path, 'seller/')) $module = 'seller';
            elseif (str_contains($path, 'checkout/')) $module = 'checkout';

            AuditService::log(
                action: "{$request->method()} {$request->path()}",
                module: $module,
                entityType: 'http_request',
                entityId: null,
                oldValues: null,
                newValues: [
                    'status_code' => $response->getStatusCode(),
                    'payload' => $request->except(['password', 'password_confirmation', 'credit_card', 'security_credential']),
                ],
                actorId: $request->user()->id
            );
        }

        return $response;
    }
}
