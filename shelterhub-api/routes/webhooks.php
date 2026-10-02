<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Webhooks\MpesaWebhookController;
use App\Http\Controllers\Webhooks\EtimsWebhookController;

/*
|--------------------------------------------------------------------------
| External Webhook Endpoints (Idempotent & Rate-Controlled)
|--------------------------------------------------------------------------
| These routes are invoked directly by third-party provider systems
| (Safaricom Daraja Gateway, KRA eTIMS, Carrier Logistics APIs).
| No CSRF or session cookies are attached; IP allowlists and signature
| validation are enforced via middleware.
*/

Route::prefix('webhooks')->group(function () {

    // ========================================================================
    // SAFARICOM DARAJA M-PESA WEBHOOKS
    // ========================================================================
    Route::prefix('mpesa')->group(function () {
        // M-Pesa Express (STK Push) customer prompt callback
        Route::post('/stk', [MpesaWebhookController::class, 'handleStkCallback'])
            ->name('webhooks.mpesa.stk');

        // C2B Direct PayBill / Till Validation URL
        Route::post('/c2b-validation', [MpesaWebhookController::class, 'handleC2bValidation'])
            ->name('webhooks.mpesa.c2b.validation');

        // C2B Direct PayBill / Till Confirmation URL
        Route::post('/c2b-confirmation', [MpesaWebhookController::class, 'handleC2bConfirmation'])
            ->name('webhooks.mpesa.c2b.confirmation');

        // B2C Seller Payout & Refund Result callback
        Route::post('/b2c-result', [MpesaWebhookController::class, 'handleB2cResult'])
            ->name('webhooks.mpesa.b2c.result');

        // B2C Timeout notification
        Route::post('/b2c-timeout', [MpesaWebhookController::class, 'handleB2cTimeout'])
            ->name('webhooks.mpesa.b2c.timeout');

        // Transaction Status Query callback
        Route::post('/transaction-status', [MpesaWebhookController::class, 'handleTransactionStatus'])
            ->name('webhooks.mpesa.status');
    });

    // ========================================================================
    // KRA eTIMS SYSTEM-TO-SYSTEM INVOICING NOTIFICATIONS
    // ========================================================================
    Route::prefix('etims')->group(function () {
        Route::post('/invoice-status', [EtimsWebhookController::class, 'handleInvoiceNotification'])
            ->name('webhooks.etims.invoice');
    });
});
