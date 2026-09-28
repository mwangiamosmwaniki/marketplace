# KESALES Laravel 13 API Backend

Robust, high-throughput, multi-vendor marketplace backend for Kenya built with **Laravel 13**, **PostgreSQL 16**, **Redis**, **Safaricom Daraja M-Pesa**, and **KRA eTIMS**.

---

## 🏛️ Architecture Overview

```text
                        ┌─────────────────────┐
                        │     KESALES Web     │
                        │ React / Next.js SPA │
                        └──────────┬──────────┘
                                   │ HTTPS / JSON (Sanctum SPA)
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                      LARAVEL 13 API                          │
│                                                              │
│  AUTH & ACCESS CONTROL                                       │
│  ├── Laravel Sanctum (Stateful Cookie-Based SPA Auth)        │
│  └── Granular RBAC (Super, Seller, Product, Finance Admins)  │
│                                                              │
│  DOMAIN-DRIVEN MODULES                                       │
│  ├── Catalog & SKU Variants                                  │
│  ├── Multi-Vendor Order Splitting Engine                     │
│  ├── Atomic Inventory with Row-Level Locks                   │
│  ├── Safaricom Daraja M-Pesa (STK Push, C2B, B2C)            │
│  ├── Double-Entry Financial Ledger (DR = CR Enforced)        │
│  ├── Escrow Accounting & Seller Payout Disbursements         │
│  ├── KRA eTIMS Automated System-to-System Invoicing          │
│  └── Auditable Log & Automated Reconciliation Engine         │
└───────────────┬──────────────────────────────────────────────┘
                │
       ┌────────┼───────────────┐
       ▼        ▼               ▼
 PostgreSQL   Redis         Object Storage
  Database   Queue/Horizon    KYC & Media
```

---

## 📂 Project Directory Structure

```text
kesales-api/
│
├── app/
│   ├── Actions/
│   │   ├── Orders/
│   │   │   └── CreateOrderAction.php         # Multi-vendor splitting & row-locked reservation
│   │   └── ...
│   │
│   ├── Domain/
│   │   ├── Finance/
│   │   │   └── Services/
│   │   │       └── LedgerPostingService.php  # Enforces SUM(debits) = SUM(credits)
│   │   └── ...
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/V1/                       # Versioned REST API Controllers
│   │   │   └── Webhooks/
│   │   │       └── MpesaWebhookController.php
│   │   └── Middleware/
│   │
│   └── Integrations/
│       ├── Mpesa/
│       │   ├── MpesaClient.php               # Token generation & password encoding
│       │   └── StkPushService.php            # Prompt dispatch & idempotent webhook processing
│       └── ETims/
│           └── EtimsClient.php               # 16% VAT breakdown & KRA QR-code generator
│
├── config/
│   └── kesales.php                           # M-Pesa, eTIMS, & Ledger COA accounts
│
├── database/
│   ├── schema.sql                            # Complete PostgreSQL DDL schema
│   └── migrations/
│
├── routes/
│   ├── api.php                               # Versioned /api/v1/ endpoints
│   └── webhooks.php                          # Isolated external webhooks (M-Pesa, eTIMS)
│
├── composer.json
└── .env.example
```

---

## 🚀 Quick Start & Installation

### 1. Requirements
- **PHP 8.3+** with `pdo_pgsql`, `redis`, `bcmath`, `curl`, `mbstring`
- **PostgreSQL 16+**
- **Redis 7+**
- **Composer 2+**

### 2. Environment Setup
```bash
cd kesales-api
cp .env.example .env

# Generate application key
php artisan key:generate

# Generate Sanctum secret
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 3. Database Migration
```bash
# Create database in PostgreSQL
createdb kesales_db

# Load schema
psql -U kesales_app -d kesales_db -f database/schema.sql

# Or run Laravel migrations
php artisan migrate --seed
```

### 4. Running the Dev Server & Horizon
```bash
# Run API server on port 8000
php artisan serve --port=8000

# Start Redis queue worker & Horizon
php artisan horizon
```

---

## 💳 Payment & Webhook Idempotency

All Safaricom Daraja STK callbacks hit `POST /webhooks/mpesa/stk`. 

- **Idempotency Guard**: The `StkPushService` locks the `mpesa_transactions` row with `lockForUpdate()`. If `processed_at` is already populated, subsequent duplicate callbacks from Safaricom are detected and safely skipped.
- **Two-Leg Principal-Agent Ledger Model**: Upon verified payment, `LedgerPostingService` creates balanced journal lines:
  - **Leg 1 (Gross GMV Clearing)**:
    - `DR 1000 M-Pesa Clearing`: Total Order Amount (e.g. KSh 10,500)
    - `CR 4000 Marketplace Gross Sales`: Subtotal (e.g. KSh 10,000)
    - `CR 4100 Delivery Revenue`: Delivery Tariff (e.g. KSh 500)
  - **Leg 2 (Escrow Liability & Revenue Recognition)**:
    - `DR 4000 Marketplace Gross Sales`: Subtotal (e.g. KSh 10,000)
    - `CR 2000 Seller Payable (Escrow)`: Merchant Net Amounts (e.g. KSh 9,000)
    - `CR 4200 Platform Commission`: Marketplace Take-Rate (e.g. KSh 1,000)
  - Guaranteed: `SUM(debits) === SUM(credits)` on every transaction.

---

## 💸 Automated B2C Seller Payouts

Sellers request payouts via `POST /api/v1/seller/payouts/request`.
1. **Verification**: Payout account (M-Pesa phone or bank) must be KYC verified.
2. **Finance Review**: Finance team reviews and approves via `POST /api/v1/finance/payouts/{id}/approve`.
3. **Disbursement**: Calling `POST /api/v1/finance/payouts/{id}/disburse` dispatches `DisburseB2CPayoutJob`.
4. **Safaricom B2C**: Calls Safaricom B2C API (`/mpesa/b2c/v1/paymentrequest`) with `PartyA` (B2C Shortcode) and `PartyB` (Seller Phone).
5. **Gateway Settlement**: Upon Safaricom's B2C Result callback (`ResultCode === 0`), `handleB2cResult` marks the payout `completed` and records the double-entry escrow release (`DR 2000 Seller Payable`, `CR 1000 M-Pesa Clearing`).

---

## 🔒 Server-Authoritative Checkout

The backend rejects any attempt by clients to submit unit prices, commissions, or delivery fees:
- `POST /api/v1/checkout/quote` accepts only `variant_id`, `quantity`, `county`, `delivery_type`, and optional `coupon_code`.
- `POST /api/v1/checkout` loads products and variants from PostgreSQL, checks active seller & product status, executes atomic inventory reservation with row-level locks, computes delivery fee from `delivery_zones`, applies server-validated coupons, and creates:
  - Master order snapshot in `orders`
  - Master order items in `order_items`
  - Partitioned tenant sub-orders in `seller_orders` and `seller_order_items`

---

## 🧪 Automated Backend Test Suite

Comprehensive automated test suite located in `tests/`:

```bash
# Run full PHPUnit / Pest test suite
php artisan test

# Or run specific test suites
./vendor/bin/pest tests/Unit
./vendor/bin/pest tests/Feature
```

### Included Test Coverage:
- `tests/Unit/LedgerPostingServiceTest.php`: Double-entry balanced verification, two-leg model, payout disbursement, refund posting.
- `tests/Unit/InventoryServiceTest.php`: Atomic reservation, safety stock locking, sale commitment, release on cancellation.
- `tests/Unit/StkPushServiceTest.php`: Phone number normalization, Daraja payload verification, idempotent webhook processing.
- `tests/Unit/EtimsClientTest.php`: 16% standard VAT breakdown calculation, invoice persistence, sandbox simulation mode.
- `tests/Feature/CheckoutApiTest.php`: Zero-trust price recalculation, master order items generation, multi-vendor order splitting.
- `tests/Feature/MpesaWebhookTest.php`: C2B validation, underpayment rejection, idempotent C2B confirmation, B2C result handling.
- `tests/Feature/AuthApiTest.php`: Sanctum customer registration, token authentication, role validation.
- `tests/Feature/FinanceApiTest.php`: RBAC authorization, balanced manual journal adjustments, B2C payout dispatch.
- `tests/Feature/ReconciliationTest.php`: 3-way automated audit across orders, payments, and general ledger accounts.

---

## 🧾 KRA eTIMS Invoicing

Every confirmed order automatically generates a compliant tax invoice via `EtimsClient`:
- Computes standard **16% VAT** (`taxblAmtB` & `taxAmtB`)
- Assigns KRA tax code `B`
- Registers eTIMS invoice number and generates verifiable KRA QR-code metadata
- Supports both **Platform** and **Merchant** invoice issuer models (`ETIMS_INVOICE_ISSUER_TYPE`)
