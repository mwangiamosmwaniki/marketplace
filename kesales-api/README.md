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
- **Ledger Posting**: Upon verified payment, the `LedgerPostingService` creates balanced journal lines:
  - `DR 1000 M-Pesa Clearing`: Total Order Amount
  - `CR 2000 Seller Payable (Escrow)`: Seller Net Payout
  - `CR 4200 Platform Commission`: Marketplace Fee (8% - 15%)
  - Guaranteed: `SUM(debits) === SUM(credits)`

---

## 🧾 KRA eTIMS Invoicing

Every confirmed order automatically generates a compliant tax invoice via `EtimsClient`:
- Computes standard **16% VAT** (`taxblAmtB` & `taxAmtB`)
- Assigns KRA tax code `B`
- Registers eTIMS invoice number and generates verifiable KRA QR-code metadata
- Supports both **Platform** and **Merchant** invoice issuer models (`ETIMS_INVOICE_ISSUER_TYPE`)
