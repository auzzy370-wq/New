# Database Schema

## Overview

TapFlow POS uses PostgreSQL 16 with Prisma ORM. All tables use UUID primary keys, and monetary values are stored as integers (cents) for precision.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| UUID primary keys | No guessable sequential IDs; safe in multi-tenant context |
| Amounts in cents (integers) | Avoids floating-point precision issues |
| Soft deletes | Data is never truly deleted; deletedAt marks as removed |
| Audit logs append-only | Immutable audit trail for financial compliance |
| Idempotency keys | Prevent duplicate payments and operations |
| Webhook event deduplication | `external_id` unique constraint prevents double-processing |

## Core Tables

### users
Authentication and identity. Stores hashed passwords, MFA secrets.
- Never query without scope — always check authorization

### merchants
One record per merchant business. The root of all multi-tenancy.
- `slug`: URL-friendly identifier
- `platformFeeRate`: typically 0.01 (1%)
- `stripeAccountId`: their Stripe Connect Express account

### merchant_users
Many-to-many between users and merchants.
- Allows one user to own multiple merchants
- `permissions`: array of granular permission strings

### locations
Physical locations for a merchant.
- Each gets a Stripe Terminal location for hardware readers

### products
Product catalog.
- `price` stored as Decimal (maps from cents in application layer)
- `trackInventory`: when false, inventory is not decremented on sale

### inventory
Current stock levels per product per location.
- One record per (location, product, variant) combination

### inventory_movements
Every inventory change is recorded here (sale, return, adjustment, etc.)
- Immutable: only inserts, never updates
- Creates a complete audit trail

### orders
The central record for a sale.
- All amounts stored in cents (integers)
- `orderNumber`: human-readable (e.g., `ORD-20240101-0001`)
- Status lifecycle: DRAFT → PENDING → PAID (or FAILED/CANCELLED)

### payments
The payment record for an order.
- Links to Stripe PaymentIntent and Charge
- `idempotencyKey`: prevents duplicate charges
- `platformFeeAmount`: our 1% cut
- `netAmount`: what the merchant receives (before Stripe fees)

### payment_attempts
Every attempt to process a payment, including failures.
- Never delete — used for dispute resolution and debugging

### refunds
Refund records.
- `idempotencyKey`: prevents duplicate refunds
- Maximum refundable amount enforced in application code

### subscriptions
$25/month Stripe subscription per merchant.
- Synced from Stripe webhooks

### platform_fees
Every 1% platform fee collected.
- Keyed to a specific payment
- Used for platform revenue reporting

### webhook_events
Every Stripe webhook received.
- `external_id`: Stripe event ID (unique constraint = idempotency)
- Status: PENDING → PROCESSED or FAILED
- Failed events can be retried

### audit_logs
Immutable audit trail for financial and administrative events.
- Records before/after values for changes
- IP address and user agent where available

## Indexes

Critical indexes for performance:

```sql
-- Tenant isolation queries
CREATE INDEX idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX idx_products_merchant_id ON products(merchant_id);
CREATE INDEX idx_payments_merchant_id ON payments(merchant_id);

-- Payment lookups
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX idx_webhook_events_external_id ON webhook_events(external_id);

-- Report queries
CREATE INDEX idx_orders_paid_at ON orders(paid_at) WHERE status = 'PAID';
CREATE INDEX idx_platform_fees_merchant_created ON platform_fees(merchant_id, created_at);

-- Customer queries
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
```

## Migrations

```bash
# Development: create + apply migration
cd apps/backend
pnpm db:migrate

# Production: apply pending migrations only (never generate)
pnpm db:migrate:deploy

# View current migration status
npx prisma migrate status
```

## Backup Strategy

Production database should be backed up:
- Continuous WAL archiving (point-in-time recovery)
- Daily snapshots with 30-day retention
- Monthly archives kept indefinitely for regulatory compliance

## Data Retention

| Data Type | Retention |
|---|---|
| Orders and payments | 7 years (financial compliance) |
| Audit logs | 7 years |
| Customer data | As per privacy policy / deletion requests |
| Webhook events | 90 days |
| Refresh tokens | 30 days (auto-expire) |
