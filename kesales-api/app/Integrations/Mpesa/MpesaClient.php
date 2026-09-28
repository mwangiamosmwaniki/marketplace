<?php

namespace App\Integrations\Mpesa;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Exception;

/**
 * Safaricom Daraja API Client
 * Manages OAuth credentials, bearer tokens, shortcodes, and security keys.
 */
class MpesaClient
{
    protected string $env;
    protected string $consumerKey;
    protected string $consumerSecret;
    protected string $shortcode;
    protected string $passkey;

    public function __construct()
    {
        $this->env = config('kesales.mpesa.env', 'sandbox');
        $this->consumerKey = config('kesales.mpesa.consumer_key', '');
        $this->consumerSecret = config('kesales.mpesa.consumer_secret', '');
        $this->shortcode = config('kesales.mpesa.shortcode', '174379');
        $this->passkey = config('kesales.mpesa.passkey', '');
    }

    public function baseUrl(): string
    {
        return $this->env === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    /**
     * Retrieves valid Bearer Token (cached in Redis for 3500 seconds)
     */
    public function getAccessToken(): string
    {
        return Cache::remember('mpesa_access_token', 3500, function () {
            $url = $this->baseUrl() . '/oauth/v1/generate?grant_type=client_credentials';

            $response = Http::withBasicAuth($this->consumerKey, $this->consumerSecret)
                ->get($url);

            if ($response->failed()) {
                throw new Exception("M-Pesa OAuth failed: " . $response->body());
            }

            return $response->json('access_token');
        });
    }

    /**
     * Generates base64 STK Push password
     */
    public function generatePassword(string $timestamp): string
    {
        return base64_encode($this->shortcode . $this->passkey . $timestamp);
    }

    public function getShortcode(): string
    {
        return $this->shortcode;
    }
}
