<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SellerController;
use App\Http\Controllers\Api\V1\FinanceController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Middleware\IdempotencyMiddleware;

/*
|--------------------------------------------------------------------------
| KESALES API v1 Routes
|--------------------------------------------------------------------------
| All endpoints are versioned and enforce strict server-authoritative logic.
| Pricing, commission, ledger entries, and inventory are computed on backend.
*/

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);

    // ========================================================================
    // 1. PUBLIC STOREFRONT & CATALOG ENDPOINTS
    // ========================================================================
    Route::get('/products', [CatalogController::class, 'index']);
    Route::get('/products/{slug}', [CatalogController::class, 'show']);
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/brands', [CatalogController::class, 'brands']);
    Route::get('/promotions', [CatalogController::class, 'promotions']);
    Route::get('/flash-sales', [CatalogController::class, 'flashSales']);
    Route::get('/sellers/{slug}', [CatalogController::class, 'sellerStore']);
    Route::get('/delivery-zones', [CatalogController::class, 'deliveryZones']);

    // ========================================================================
    // 2. AUTHENTICATION & IDENTITY (Sanctum SPA)
    // ========================================================================
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
            Route::post('/verify-phone', [AuthController::class, 'verifyPhone']);
        });
    });

    // ========================================================================
    // 3. CART & SERVER-AUTHORITATIVE CHECKOUT
    // ========================================================================
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'getCart']);
        Route::post('/items', [CartController::class, 'addItem']);
        Route::patch('/items/{itemId}', [CartController::class, 'updateItem']);
        Route::delete('/items/{itemId}', [CartController::class, 'removeItem']);
        Route::delete('/clear', [CartController::class, 'clearCart']);
    });

    Route::prefix('checkout')->group(function () {
        // Server calculates subtotal, discounts, county tariffs, and taxes
        Route::post('/quote', [CheckoutController::class, 'calculateQuote']);
        Route::post('/', [CheckoutController::class, 'createOrder'])
            ->middleware(['auth:sanctum', IdempotencyMiddleware::class]);
        Route::get('/{orderNumber}/status', [CheckoutController::class, 'orderStatus'])->middleware('auth:sanctum');
    });

    // ========================================================================
    // 4. PAYMENTS & M-PESA STK PUSH
    // ========================================================================
    Route::prefix('payments')->middleware('auth:sanctum')->group(function () {
        Route::post('/mpesa/stk', [PaymentController::class, 'initiateStkPush']);
        Route::get('/{paymentId}', [PaymentController::class, 'getPayment']);
        Route::post('/{paymentId}/verify', [PaymentController::class, 'verifyPayment']);
    });

    // ========================================================================
    // 5. AUTHENTICATED CUSTOMER PORTAL
    // ========================================================================
    Route::prefix('me')->middleware(['auth:sanctum', 'can:customer'])->group(function () {
        Route::get('/orders', [CustomerController::class, 'orders']);
        Route::get('/orders/{orderNumber}', [CustomerController::class, 'showOrder']);
        Route::post('/orders/{orderNumber}/cancel', [CustomerController::class, 'cancelOrder']);
        Route::post('/orders/{orderNumber}/return', [CustomerController::class, 'requestReturn']);

        Route::get('/addresses', [CustomerController::class, 'addresses']);
        Route::post('/addresses', [CustomerController::class, 'createAddress']);
        Route::patch('/addresses/{addressId}', [CustomerController::class, 'updateAddress']);
        Route::delete('/addresses/{addressId}', [CustomerController::class, 'deleteAddress']);

        Route::get('/wishlist', [CustomerController::class, 'wishlist']);
        Route::post('/wishlist/{productId}', [CustomerController::class, 'toggleWishlist']);

        Route::post('/reviews', [CustomerController::class, 'submitReview']);
    });

    // ========================================================================
    // 6. SELLER CENTER PORTAL (Scoped to Authenticated Merchant)
    // ========================================================================
    Route::prefix('seller')->middleware(['auth:sanctum', 'can:seller'])->group(function () {
        Route::get('/dashboard', [SellerController::class, 'dashboardMetrics']);
        Route::get('/products', [SellerController::class, 'products']);
        Route::post('/products', [SellerController::class, 'storeProduct']);
        Route::get('/products/{id}', [SellerController::class, 'showProduct']);
        Route::patch('/products/{id}', [SellerController::class, 'updateProduct']);
        Route::delete('/products/{id}', [SellerController::class, 'deleteProduct']);

        Route::get('/inventory', [SellerController::class, 'inventory']);
        Route::post('/inventory/adjust', [SellerController::class, 'adjustInventory']);

        Route::get('/orders', [SellerController::class, 'subOrders']);
        Route::get('/orders/{subOrderNumber}', [SellerController::class, 'showSubOrder']);
        Route::post('/orders/{subOrderNumber}/fulfill', [SellerController::class, 'fulfillSubOrder']);

        Route::get('/payouts', [SellerController::class, 'payouts']);
        Route::post('/payouts/request', [SellerController::class, 'requestPayout']);

        Route::get('/verification', [SellerController::class, 'verificationStatus']);
        Route::post('/documents', [SellerController::class, 'uploadDocument']);
        Route::patch('/settings', [SellerController::class, 'updateStoreSettings']);
    });

    // ========================================================================
    // 7. FINANCE & ESCROW CONSOLE (RBAC Guarded: finance_admin)
    // ========================================================================
    Route::prefix('finance')->middleware('auth:sanctum')->group(function () {
        Route::get('/dashboard', [FinanceController::class, 'overviewMetrics'])->middleware('can:finance.dashboard.view');
        Route::get('/orders', [FinanceController::class, 'ordersFinancialView'])->middleware('can:finance.orders.view');
        Route::get('/orders/{orderId}', [FinanceController::class, 'showOrderFinancials'])->middleware('can:finance.orders.view');

        Route::get('/payments', [FinanceController::class, 'payments'])->middleware('can:finance.payments.view');
        Route::get('/payments/{paymentId}', [FinanceController::class, 'showPayment'])->middleware('can:finance.payments.view');
        Route::post('/payments/{paymentId}/reconcile', [FinanceController::class, 'reconcilePayment'])->middleware('can:finance.payments.reconcile');

        Route::get('/refunds', [FinanceController::class, 'refunds'])->middleware('can:finance.refunds.view');
        Route::post('/refunds/{refundId}/approve', [FinanceController::class, 'approveRefund'])->middleware('can:finance.refunds.approve');
        Route::post('/refunds/{refundId}/reject', [FinanceController::class, 'rejectRefund'])->middleware('can:finance.refunds.reject');
        Route::post('/refunds/{refundId}/process', [FinanceController::class, 'processRefundPayout'])->middleware('can:finance.refunds.process');

        Route::get('/payouts', [FinanceController::class, 'payouts'])->middleware('can:finance.payouts.view');
        Route::post('/payouts/{payoutId}/approve', [FinanceController::class, 'approvePayout'])->middleware('can:finance.payouts.approve');
        Route::post('/payouts/{payoutId}/hold', [FinanceController::class, 'holdPayout'])->middleware('can:finance.payouts.hold');
        Route::post('/payouts/{payoutId}/reject', [FinanceController::class, 'rejectPayout'])->middleware('can:finance.payouts.reject');
        Route::post('/payouts/{payoutId}/disburse', [FinanceController::class, 'disburseB2CPayout'])->middleware('can:finance.payouts.disburse');

        Route::get('/ledger', [FinanceController::class, 'ledgerEntries'])->middleware('can:finance.ledger.view');
        Route::post('/ledger/adjustments', [FinanceController::class, 'createJournalAdjustment'])->middleware('can:finance.ledger.adjust');

        Route::get('/reconciliation', [FinanceController::class, 'reconciliationRuns'])->middleware('can:finance.reconciliation.view');
        Route::post('/reconciliation/run', [FinanceController::class, 'triggerReconciliation'])->middleware('can:finance.reconciliation.run');
        Route::post('/reconciliation/exceptions/{id}/resolve', [FinanceController::class, 'resolveException'])->middleware('can:finance.reconciliation.resolve');

        Route::get('/reports', [FinanceController::class, 'reportsSummary'])->middleware('can:finance.reports.view');
        Route::post('/reports/export', [FinanceController::class, 'exportReportJob'])->middleware('can:finance.reports.export');
    });

    // ========================================================================
    // 8. ADMIN CONTROL HUB (RBAC Guarded: super_admin, seller_admin, product_admin)
    // ========================================================================
    Route::prefix('admin')->middleware(['auth:sanctum'])->group(function () {
        // Product Catalog Moderation
        Route::middleware('can:products.manage')->group(function () {
            Route::get('/products', [AdminController::class, 'allProducts']);
            Route::post('/products/{id}/approve', [AdminController::class, 'approveProduct']);
            Route::post('/products/{id}/reject', [AdminController::class, 'rejectProduct']);
            Route::apiResource('categories', CategoryController::class);
            Route::apiResource('brands', BrandController::class);
        });

        // Seller Governance & KYC
        Route::middleware('can:sellers.manage')->group(function () {
            Route::get('/sellers', [AdminController::class, 'sellers']);
            Route::get('/sellers/{id}', [AdminController::class, 'showSeller']);
            Route::post('/sellers/{id}/approve', [AdminController::class, 'approveSeller']);
            Route::post('/sellers/{id}/suspend', [AdminController::class, 'suspendSeller']);
            Route::post('/sellers/documents/{docId}/verify', [AdminController::class, 'verifyDocument']);
        });

        // Super Admin Platform Controls
        Route::middleware('can:super_admin')->group(function () {
            Route::get('/users', [AdminController::class, 'users']);
            Route::post('/users', [AdminController::class, 'createUser']);
            Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
            Route::post('/users/{id}/suspend', [AdminController::class, 'suspendUser']);

            Route::get('/roles', [AdminController::class, 'roles']);
            Route::get('/permissions', [AdminController::class, 'permissions']);
            Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
            Route::get('/system/settings', [AdminController::class, 'systemSettings']);
            Route::patch('/system/settings', [AdminController::class, 'updateSettings']);
        });
    });
});
