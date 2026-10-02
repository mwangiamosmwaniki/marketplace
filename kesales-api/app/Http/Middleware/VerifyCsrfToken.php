<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken as BaseVerifier;

class VerifyCsrfToken extends BaseVerifier
{
    protected $except = [
        'api/v1/auth/login',
        'api/v1/auth/register',
        'api/v1/auth/forgot-password',
        'api/v1/auth/reset-password',
    ];

    protected function inExceptArray($request)
    {
        return app()->environment('local') && parent::inExceptArray($request);
    }
}
