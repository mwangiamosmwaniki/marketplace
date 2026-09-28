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
    protected string $b2cShortcode;
    protected string $b2cInitiator;
    protected string $b2cSecurityCredential;
    protected string $b2cResultUrl;
    protected string $b2cTimeoutUrl;

    public function __construct()
    {
        $this->env = config('kesales.mpesa.env', 'sandbox');
        $this->consumerKey = config('kesales.mpesa.consumer_key', '');
        $this->consumerSecret = config('kesales.mpesa.consumer_secret', '');
        $this->shortcode = config('kesales.mpesa.shortcode', '174379');
        $this->passkey = config('kesales.mpesa.passkey', '');
        $this->b2cShortcode = config('kesales.mpesa.b2c_shortcode', '600000');
        $this->b2cInitiator = config('kesales.mpesa.b2c_initiator', 'testinitiator');
        $this->b2cSecurityCredential = config('kesales.mpesa.b2c_security_credential', '');
        $this->b2cResultUrl = config('kesales.mpesa.b2c_result_url', 'https://api.kesales.ke/webhooks/mpesa/b2c/result');
        $this->b2cTimeoutUrl = config('kesales.mpesa.b2c_timeout_url', 'https://api.kesales.ke/webhooks/mpesa/b2c/timeout');
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

    /**
     * Dispatches Daraja B2C Payout to Merchant/Seller Handset
     */
    public function sendB2cPayment(
        string $phone,
        float $amount,
        string $remarks,
        string $occasion = 'Seller Payout',
        string $commandId = 'BusinessPayment'
    ): array {
        $formattedPhone = preg_replace('/^(?:\+?254|0)?/', '254', trim($phone));
        $token = $this->getAccessToken();

        $payload = [
            'InitiatorName' => $this->b2cInitiator,
            'SecurityCredential' => $this->b2cSecurityCredential,
            'CommandID' => $commandId,
            'Amount' => (int) round($amount),
            'PartyA' => $this->b2cShortcode,
            'PartyB' => $formattedPhone,
            'Remarks' => substr($remarks, 0, 100),
            'QueueTimeOutURL' => $this->b2cTimeoutUrl,
            'ResultURL' => $this->b2cResultUrl,
            'Occasion' => substr($occasion, 0, 100),
        ];

        $response = Http::withToken($token)
            ->post($this->baseUrl() . '/mpesa/b2c/v1/paymentrequest', $payload);

        if ($response->failed()) {
            throw new Exception("Daraja B2C API rejected payment request: " . $response->body());
        }

        return $response->json();
    }

    /**
     * Registers C2B Validation and Confirmation URLs with Safaricom Daraja
     */
    public function registerC2bUrl(string $validationUrl, string $confirmationUrl, string $responseType = 'Completed'): array
    {
        $token = $this->getAccessToken();

        $payload = [
            'ShortCode' => $this->shortcode,
            'ResponseType' => $responseType,
            'ConfirmationURL' => $confirmationUrl,
            'ValidationURL' => $validationUrl,
        ];

        $response = Http::withToken($token)
            ->post($this->baseUrl() . '/mpesa/c2b/v1/registerurl', $payload);

        if ($response->failed()) {
            throw new Exception("Daraja C2B URL Registration failed: " . $response->body());
        }

        return $response->json();
    }
}
