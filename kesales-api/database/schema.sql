-- ============================================================================
-- KESALES RELATIONAL DATABASE SCHEMA (PostgreSQL 16+)
-- Kenya Multi-Vendor Marketplace Core DDL
-- Enforces: Relational integrity, double-entry financial balancing, row locks,
-- atomic inventory reservations, multi-vendor order splitting, and audit logging.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. IDENTITY & ACCESS MANAGEMENT (RBAC + Sanctum)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'deactivated')),
    email_verified_at TIMESTAMP WITH TIME ZONE NULL,
    phone_verified_at TIMESTAMP WITH TIME ZONE NULL,
    avatar_url TEXT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    module VARCHAR(80) NOT NULL,
    action VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_module ON permissions(module);

CREATE TABLE role_user (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permission_role (
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, role_id)
);

CREATE TABLE personal_access_tokens (
    id BIGSERIAL PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    abilities TEXT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. SELLER DOMAIN & COMPLIANCE KYC
-- ============================================================================

CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    store_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    seller_type VARCHAR(50) DEFAULT 'business' CHECK (seller_type IN ('individual', 'business', 'official_brand')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'suspended', 'reverification_required')),
    commission_rate NUMERIC(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    description TEXT NULL,
    logo_path TEXT NULL,
    banner_path TEXT NULL,
    rating NUMERIC(3,2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_profiles (
    seller_id UUID PRIMARY KEY REFERENCES sellers(id) ON DELETE CASCADE,
    business_registration_number VARCHAR(100) NULL,
    kra_pin VARCHAR(50) NOT NULL,
    vat_number VARCHAR(50) NULL,
    business_type VARCHAR(100) NULL,
    country VARCHAR(100) DEFAULT 'Kenya',
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    physical_address TEXT NOT NULL,
    postal_address TEXT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    document_type VARCHAR(80) NOT NULL CHECK (document_type IN ('national_id', 'passport', 'business_permit', 'cr12', 'tax_compliance', 'bank_statement')),
    document_number VARCHAR(120) NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
    issued_at DATE NULL,
    expires_at DATE NULL,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    verified_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_payout_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('mpesa_b2c', 'bank_transfer', 'mpesa_till')),
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(150) NULL,
    bank_code VARCHAR(50) NULL,
    mpesa_number VARCHAR(32) NULL,
    verification_status VARCHAR(50) DEFAULT 'verified',
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. CATALOG & PRODUCT VARIANTS
-- ============================================================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INT NULL REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT NULL,
    image_url TEXT NULL,
    status VARCHAR(32) DEFAULT 'active',
    sort_order INT DEFAULT 0
);

CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    logo_url TEXT NULL,
    is_official BOOLEAN DEFAULT false,
    status VARCHAR(32) DEFAULT 'active'
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id INT NULL REFERENCES brands(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT NULL,
    tax_type VARCHAR(32) NOT NULL DEFAULT 'standard',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'pending_approval', 'active', 'rejected', 'archived')),
    condition VARCHAR(50) DEFAULT 'new' CHECK (condition IN ('new', 'refurbished', 'open_box')),
    warranty_info VARCHAR(255) NULL,
    return_policy_days INT DEFAULT 15,
    is_featured BOOLEAN DEFAULT false,
    is_flash_sale BOOLEAN DEFAULT false,
    is_express BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(12,2) NULL CHECK (discount_price IS NULL OR discount_price <= price),
    cost_price NUMERIC(12,2) NULL,
    weight_kg NUMERIC(6,3) DEFAULT 0.500,
    status VARCHAR(32) DEFAULT 'active'
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false
);

-- ============================================================================
-- 4. ATOMIC INVENTORY & STOCK RESERVATIONS
-- ============================================================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_level INT DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_inventory_reserved CHECK (quantity_reserved <= quantity_on_hand)
);

CREATE UNIQUE INDEX idx_inventory_variant ON inventory_items(variant_id);

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'reservation', 'release', 'return', 'adjustment', 'damage', 'transfer')),
    quantity INT NOT NULL,
    reference_type VARCHAR(100) NOT NULL,
    reference_id UUID NOT NULL,
    before_quantity INT NOT NULL,
    after_quantity INT NOT NULL,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. ORDERS & MULTI-VENDOR SPLITTING ENGINE
-- ============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(64) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    currency VARCHAR(3) DEFAULT 'KES',
    subtotal NUMERIC(14,2) NOT NULL,
    discount_total NUMERIC(14,2) DEFAULT 0.00,
    delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(14,2) DEFAULT 0.00,
    grand_total NUMERIC(14,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
        'PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING', 'READY_FOR_DISPATCH',
        'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'
    )),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(32) DEFAULT 'shipping',
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    street_address TEXT NOT NULL,
    delivery_instructions TEXT NULL
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    seller_id UUID NOT NULL REFERENCES sellers(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(120) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_type VARCHAR(32) NOT NULL DEFAULT 'standard',
    taxable_amount NUMERIC(12,2) NULL,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_line_total NUMERIC(12,2) NULL,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sub_order_number VARCHAR(64) UNIQUE NOT NULL,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
    subtotal NUMERIC(14,2) NOT NULL,
    delivery_share NUMERIC(14,2) DEFAULT 0.00,
    commission_total NUMERIC(14,2) NOT NULL,
    seller_net_payout NUMERIC(14,2) NOT NULL,
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled')),
    carrier VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    is_settled BOOLEAN DEFAULT false,
    settlement_eligible_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seller_order_events_order_created
    ON seller_order_events(seller_order_id, created_at);

CREATE TABLE seller_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(120) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_line_total NUMERIC(12,2) NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(12,2) NOT NULL,
    seller_net_amount NUMERIC(12,2) NOT NULL
);

-- ============================================================================
-- 6. PAYMENTS & SAFARICOM DARAJA M-PESA INTEGRATION
-- ============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('mpesa', 'card', 'bank', 'cash_on_delivery')),
    method VARCHAR(50) NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'initiated', 'authorized', 'paid', 'failed', 'cancelled', 'reversed', 'refunded')),
    provider_transaction_id VARCHAR(150) NULL,
    provider_request_id VARCHAR(150) NULL,
    paid_at TIMESTAMP WITH TIME ZONE NULL,
    failed_at TIMESTAMP WITH TIME ZONE NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    merchant_request_id VARCHAR(100) NOT NULL,
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    mpesa_receipt_number VARCHAR(100) UNIQUE NULL,
    result_code INT NULL,
    result_description TEXT NULL,
    phone_number VARCHAR(32) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NULL,
    raw_request JSONB NULL,
    raw_response JSONB NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_mpesa_checkout_req ON mpesa_transactions(checkout_request_id);

CREATE TABLE mpesa_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    checkout_request_id VARCHAR(100) NULL,
    payload JSONB NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'unprocessed' CHECK (processing_status IN ('unprocessed', 'queued', 'processing', 'processed', 'duplicate', 'failed')),
    processing_started_at TIMESTAMP WITH TIME ZONE NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. DOUBLE-ENTRY FINANCIAL LEDGER & ESCROW ACCOUNTING
-- ============================================================================

CREATE TABLE accounts (
    id INT PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    currency VARCHAR(3) DEFAULT 'KES',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core Chart of Accounts seed
INSERT INTO accounts (id, code, name, type) VALUES
(1000, '1000', 'M-Pesa Clearing & Settlement', 'asset'),
(1100, '1100', 'Payment Processor Receivables', 'asset'),
(2000, '2000', 'Seller Payable (Escrow)', 'liability'),
(2100, '2100', 'Customer Refund Payable', 'liability'),
(3000, '3000', 'Platform Retained Earnings', 'equity'),
(4000, '4000', 'Marketplace Gross Sales', 'revenue'),
(4100, '4100', 'Delivery Fee Revenue', 'revenue'),
(4200, '4200', 'Platform Commission Revenue', 'revenue'),
(5000, '5000', 'Payment Gateway Processing Fees', 'expense'),
(5100, '5100', 'Customer Refund & Concession Expense', 'expense'),
(5200, '5200', 'Carrier Logistics Expense', 'expense'),
(5300, '5300', 'Platform Promotion Discounts', 'expense')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(64) UNIQUE NOT NULL,
    type VARCHAR(80) NOT NULL CHECK (type IN ('order_payment', 'seller_settlement', 'platform_commission', 'delivery_fee', 'refund', 'payout_disbursement', 'manual_adjustment')),
    reference_type VARCHAR(80) NOT NULL,
    reference_id UUID NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX financial_transactions_business_event_unique
    ON financial_transactions(type, reference_type, reference_id);

CREATE TABLE financial_transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(14,2) DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(14,2) DEFAULT 0.00 CHECK (credit >= 0),
    currency VARCHAR(3) DEFAULT 'KES',
    seller_id UUID NULL REFERENCES sellers(id) ON DELETE SET NULL,
    order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT chk_debit_credit_exclusive CHECK (
        (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
    )
);

CREATE INDEX idx_ledger_lines_account ON financial_transaction_lines(account_id);
CREATE INDEX idx_ledger_lines_seller ON financial_transaction_lines(seller_id);

-- ============================================================================
-- 8. SELLER PAYOUTS (M-Pesa B2C Bulk Disbursement)
-- ============================================================================

CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number VARCHAR(64) UNIQUE NOT NULL,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 500),
    currency VARCHAR(3) DEFAULT 'KES',
    method VARCHAR(50) DEFAULT 'mpesa_b2c' CHECK (method IN ('mpesa_b2c', 'bank_transfer')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'held', 'rejected', 'failed', 'timeout_pending_reconciliation')),
    provider VARCHAR(50) NULL,
    provider_request_id VARCHAR(150) NULL,
    provider_conversation_id VARCHAR(150) NULL,
    provider_transaction_id VARCHAR(150) NULL,
    provider_status VARCHAR(50) NULL,
    provider_result_code VARCHAR(64) NULL,
    provider_result_message TEXT NULL,
    provider_requested_at TIMESTAMP WITH TIME ZONE NULL,
    provider_completed_at TIMESTAMP WITH TIME ZONE NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    processed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    failure_reason TEXT NULL
);

CREATE TABLE payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL,
    commission_deduction NUMERIC(14,2) NOT NULL,
    net_amount NUMERIC(14,2) NOT NULL
);

-- ============================================================================
-- 9. REFUNDS & RETURN MERCHANDISE (RMA)
-- ============================================================================

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID NULL REFERENCES sellers(id) ON DELETE SET NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'processing', 'provider_pending', 'timeout_pending_reconciliation', 'completed', 'failed', 'rejected')),
    provider_conversation_id VARCHAR(150) NULL,
    provider_request_id VARCHAR(150) NULL,
    provider_transaction_id VARCHAR(150) NULL UNIQUE,
    provider_status VARCHAR(50) NULL,
    provider_result_code VARCHAR(64) NULL,
    provider_result_message TEXT NULL,
    provider_requested_at TIMESTAMP WITH TIME ZONE NULL,
    provider_completed_at TIMESTAMP WITH TIME ZONE NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'item_shipped', 'item_received', 'inspected', 'refund_issued', 'rejected')),
    tracking_number VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. RECONCILIATION & AUDIT LOGS
-- ============================================================================

CREATE TABLE reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date DATE NOT NULL,
    total_processed INT DEFAULT 0,
    total_exceptions INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
    type VARCHAR(80) NOT NULL CHECK (type IN ('UNMATCHED_PAYMENT', 'AMOUNT_MISMATCH', 'DUPLICATE_PAYMENT', 'MISSING_PROVIDER_REFERENCE', 'UNMATCHED_PAYOUT', 'UNBALANCED_LEDGER')),
    reference_id VARCHAR(150) NOT NULL,
    expected_amount NUMERIC(14,2) NULL,
    actual_amount NUMERIC(14,2) NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
    resolution_notes TEXT NULL,
    resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(80) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    request_id VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 11. KRA eTIMS COMPLIANCE INVOICING
-- ============================================================================

CREATE TABLE tax_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    seller_id UUID NULL REFERENCES sellers(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    taxable_amount NUMERIC(14,2) NOT NULL,
    vat_amount NUMERIC(14,2) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    etims_invoice_number VARCHAR(100) NULL,
    etims_qr_code TEXT NULL,
    etims_status VARCHAR(50) DEFAULT 'pending' CHECK (etims_status IN ('pending', 'submitted', 'verified', 'failed')),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE NULL
);
