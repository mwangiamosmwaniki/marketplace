# Allsales Multi-Vendor Marketplace

Kenya's premier production-ready, multi-vendor e-commerce marketplace platform built for scale, featuring Customer Storefront, Seller Center, Admin Control Hub, Safaricom Daraja M-Pesa integration, and automated multi-vendor order splitting.

---

## 🚀 Key Functional Systems

### 1. Customer Storefront & Catalog
- **Dynamic Search & Filtering**: Multi-attribute filtering across 47 Kenyan counties, categories, official stores, price range, and star rating.
- **Product Details**: SKU variation matrix (Storage, RAM, Color, Size) with live inventory checks and verified buyer reviews.
- **Cart & Multi-Vendor Grouping**: Real-time cart calculations grouping products by vendor, computing localized delivery fees and coupon deductions.
- **Checkout & Safaricom Daraja M-Pesa**: Direct STK push integration, pickup station hub selection, and pay-on-delivery options.

### 2. Multi-Vendor Order Splitting Engine
When a customer places a master order containing items from multiple independent vendors:
```text
Customer Master Order (e.g. JM-ORD-8829104)
 ├── Seller Sub-Order A: Tech Point Kenya (Electronics)
 │    ├── Item 1: Samsung Galaxy S24 Ultra (Qty: 1)
 │    └── Item 2: Anker 737 Power Bank (Qty: 2)
 └── Seller Sub-Order B: Kilifi Spice & Goods (Food & Household)
      └── Item 3: Pure Kilifi Ground Cardamom (Qty: 1)
```
- Atomic database transactions ensure stock is verified and reserved.
- Automated platform commission deduction (8% - 15% based on product category).
- Immutable double-entry financial ledger records created for each sub-order.

### 3. Customer Portal
- Dedicated sidebar navigation for:
  - **Orders & Live Tracking**: Real-time status tracker (Confirmed → Dispatched → In Transit → Delivered).
  - **Returns & Refunds**: 15-day return window with instant M-Pesa refund disbursement.
  - **Saved Wishlist**: Move-to-cart functionality and price alerts.
  - **Address Book & Pickup Stations**: 47-county Kenyan delivery addresses and regional hub pickups.

### 4. Seller Center
- Multi-tenant vendor dashboard with:
  - SKU & inventory management with low-stock alerts.
  - Real-time sub-order fulfillment & dispatch tracking.
  - Escrow accounting: Pending Balance (in escrow) vs. Available Balance (settled post-return window).
  - Automated M-Pesa and bank payout requests with threshold validation.
  - Store customization, logo, banner, and performance rating metrics.

### 5. Admin Control Hub
- Granular Role-Based Access Control (RBAC):
  - `super_admin`: Full governance, financial audit logs, and system settings.
  - `finance_admin`: Double-entry ledger audit, payout batch approvals, and escrow releases.
  - `seller_admin`: Vendor KYC verification, business tax PIN audit, and store sanctions.
  - `logistics_admin`: Kenya 47 counties delivery zones tariffs and pickup station management.
- Live platform metrics: Gross Merchandise Value (GMV), net retained commissions, merchant counts, and fulfillment SLAs.

---

## 📂 Architecture & Domain Models

### Core Models
- `User`: Customers, Sellers, and Admin personas with role permissions.
- `Seller`: Business profile, tax PIN, KYC compliance, ratings, and escrow balances.
- `Product` & `ProductVariant`: SKU, attributes, pricing, discounts, and inventory stocks.
- `MasterOrder`: Customer checkout record, payment reference, and delivery instructions.
- `SellerSubOrder`: Isolated vendor sub-order with independent fulfillment lifecycle.
- `LedgerEntry`: Immutable double-entry accounting records (`order_payment`, `seller_payable`, `platform_commission`, `delivery_fee`, `payout_disbursed`).
- `DeliveryZone`: County-specific home delivery fees, pickup station rates, and transit estimates.

---

## 🛠️ REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/products` | Paginated product catalog with category/brand filters |
| `POST` | `/api/v1/checkout` | Master order creation and seller order splitting |
| `POST` | `/api/v1/payments/mpesa/stkpush` | Safaricom Daraja STK Push prompt |
| `POST` | `/api/v1/payments/mpesa/callback` | Idempotent webhook callback processing |
| `GET` | `/api/v1/seller/orders` | Seller-scoped sub-orders and fulfillment actions |
| `POST` | `/api/v1/seller/payouts` | Payout withdrawal request from available escrow |
| `GET` | `/api/v1/admin/ledger` | Double-entry platform financial audit trail |

---

## 💻 Development & Execution

```bash
# Install dependencies
npm install

# Run dev server on port 3000
npm run dev

# Build for production
npm run build

# Run linting check
npm run lint
```
