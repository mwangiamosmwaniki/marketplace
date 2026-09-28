<?php

return [
    /*
    |--------------------------------------------------------------------------
    | KESALES Marketplace Configuration
    |--------------------------------------------------------------------------
    | Core settings for Safaricom Daraja M-Pesa, KRA eTIMS, Escrow settlement,
    | commissions, and double-entry financial ledger accounts.
    */

    'platform' => [
        'name' => env('APP_NAME', 'KESALES'),
        'currency' => 'KES',
        'default_commission_rate' => 10.00,
        'return_window_days' => 15,
        'min_payout_amount' => 500, // Minimum seller payout in KSh
    ],

    // Safaricom Daraja M-Pesa
    'mpesa' => [
        'env' => env('MPESA_ENV', 'sandbox'),
        'consumer_key' => env('MPESA_CONSUMER_KEY', ''),
        'consumer_secret' => env('MPESA_CONSUMER_SECRET', ''),
        'passkey' => env('MPESA_PASSKEY', ''),
        'shortcode' => env('MPESA_SHORTCODE', '174379'),
        'stk_callback_url' => env('MPESA_STK_CALLBACK_URL', 'https://api.kesales.ke/webhooks/mpesa/stk'),
        'b2c_shortcode' => env('MPESA_B2C_SHORTCODE', ''),
        'b2c_initiator' => env('MPESA_B2C_INITIATOR_NAME', ''),
        'b2c_security_credential' => env('MPESA_B2C_SECURITY_CREDENTIAL', ''),
        'b2c_result_url' => env('MPESA_B2C_RESULT_URL', 'https://api.kesales.ke/webhooks/mpesa/b2c/result'),
        'b2c_timeout_url' => env('MPESA_B2C_TIMEOUT_URL', 'https://api.kesales.ke/webhooks/mpesa/b2c/timeout'),
        'c2b_validation_url' => env('MPESA_C2B_VALIDATION_URL', 'https://api.kesales.ke/webhooks/mpesa/c2b/validation'),
        'c2b_confirmation_url' => env('MPESA_C2B_CONFIRMATION_URL', 'https://api.kesales.ke/webhooks/mpesa/c2b/confirmation'),
    ],

    // KRA eTIMS Tax Invoicing
    'etims' => [
        'env' => env('ETIMS_ENV', 'sandbox'),
        'base_url' => env('ETIMS_BASE_URL', 'https://etims-api.kra.go.ke'),
        'tin_pin' => env('ETIMS_TIN_PIN', 'P000000000X'),
        'branch_id' => env('ETIMS_BRANCH_ID', '00'),
        'device_id' => env('ETIMS_DEVICE_ID', 'DEV-001'),
        'auth_key' => env('ETIMS_AUTH_KEY', ''),
        'issuer_type' => env('ETIMS_INVOICE_ISSUER_TYPE', 'platform'),
    ],

    // Chart of Accounts IDs
    'ledger' => [
        'accounts' => [
            'mpesa_clearing' => 1000,
            'processor_receivables' => 1100,
            'seller_payable' => 2000,
            'customer_refund_payable' => 2100,
            'platform_equity' => 3000,
            'marketplace_sales' => 4000,
            'delivery_revenue' => 4100,
            'commission_revenue' => 4200,
            'processing_fee_expense' => 5000,
            'refund_expense' => 5100,
            'logistics_expense' => 5200,
        ],
    ],
];
