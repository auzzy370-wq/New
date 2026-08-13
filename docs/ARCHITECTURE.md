# Architecture

## System Overview

TapFlow POS is a multi-tenant SaaS POS platform. The architecture is designed for:

- **Multi-tenancy**: Complete data isolation between merchants
- **Reliability**: Payments are always verified server-side; mobile clients never determine payment success
- **Security**: Stripe secret keys never leave the backend
- **Scalability**: Stateless API with Redis-backed sessions and BullMQ workers

---

## Payment Architecture

```
MERCHANT DEVICE
    │
    ▼
TAPFLOW MOBILE APP (iOS/Android)
    │  Uses Stripe Terminal SDK (official)
    │  Collects client_secret from our backend
    │  NEVER stores raw card data
    │
    ▼
TAPFLOW BACKEND API (NestJS)
    │  Creates PaymentIntent via Stripe API
    │  Applies application_fee_amount (1% platform fee)
    │  Receives webhook confirmations
    │  Updates order status authoritatively
    │
    ▼
STRIPE CONNECT
    │  Manages merchant accounts (Express)
    │  Routes funds to merchant's bank
    │  Deducts platform fee to our account
    │
    ▼
STRIPE TERMINAL
    │  Processes card-present transactions
    │  Handles EMV compliance
    │  Manages NFC/contactless
    │
    ▼
CUSTOMER CARD / PHONE / WALLET
```

### Payment Security Principles

1. **Never trust the client**: The mobile app cannot declare a payment successful. Only backend + webhook confirmation changes order status to PAID.
2. **Idempotency**: Every payment request carries an idempotency key. Double-taps and network retries never create duplicate charges.
3. **Webhook verification**: All Stripe webhooks are verified using HMAC signature before processing.
4. **Secrets stay on server**: `STRIPE_SECRET_KEY` is only in the backend environment. The mobile app only receives `client_secret` for its specific transaction.

---

## Multi-Tenancy

Every database record that belongs to a merchant includes a `merchant_id` foreign key. The `MerchantGuard` enforces that every API request includes a valid merchant context and that the authenticated user belongs to that merchant.

**Tenant isolation checklist:**
- [ ] All queries filter by `merchantId`
- [ ] `MerchantGuard` enforces access on every merchant-scoped endpoint
- [ ] Platform admin endpoints are protected by `AdminOnly()` decorator
- [ ] No cross-tenant data accessible via any API

---

## Backend Modules

| Module | Responsibility |
|---|---|
| `AuthModule` | JWT auth, refresh token rotation, MFA (TOTP), email verification |
| `MerchantsModule` | Merchant creation, Stripe Connect onboarding |
| `LocationsModule` | Multi-location management, Stripe Terminal locations |
| `ProductsModule` | Product catalog, categories, variants, modifiers |
| `InventoryModule` | Inventory tracking, movements, low-stock alerts |
| `CustomersModule` | CRM, purchase history |
| `OrdersModule` | Order lifecycle management |
| `PaymentsModule` | Stripe Terminal payment intents, cash payments |
| `RefundsModule` | Full/partial refunds, inventory restoration |
| `SubscriptionsModule` | $25/month Stripe Subscriptions |
| `WebhooksModule` | Stripe webhook processing with idempotency |
| `ReportsModule` | Sales analytics, platform revenue |
| `EmployeesModule` | RBAC employees, PIN verification |
| `DevicesModule` | Terminal device registration |
| `RegistersModule` | Cash register sessions |
| `AdminModule` | Platform admin (merchant management, revenue) |
| `AuditModule` | Immutable audit trail |
| `NotificationsModule` | Email notifications, in-app notifications |

---

## Database

PostgreSQL 16 with Prisma ORM.

Key design decisions:
- UUID primary keys everywhere (no guessable sequential IDs)
- All monetary values stored as integers (cents)
- Soft deletes on users, merchants, products, customers
- Separate `payment_attempts` table for retry tracking
- `webhook_events` table with idempotency (deduplicated by `external_id`)
- `audit_logs` table is append-only

See [DATABASE.md](DATABASE.md) for the full schema documentation.

---

## Frontend

Next.js 14 with App Router.

### Route Structure

```
/                     → redirect to /dashboard
/auth/login           → Login page
/auth/register        → Registration + onboarding start
/auth/verify-email    → Email verification
/auth/forgot-password → Password reset request
/auth/reset-password  → Password reset with token
/onboarding           → Step-by-step merchant onboarding
/dashboard            → Merchant dashboard home
/dashboard/orders     → Order history + search
/dashboard/products   → Product catalog management
/dashboard/inventory  → Inventory management
/dashboard/customers  → CRM
/dashboard/employees  → Employee management
/dashboard/reports    → Analytics
/dashboard/billing    → Subscription management
/dashboard/settings   → Merchant settings
/pos                  → POS terminal interface
/admin                → Platform admin (platform_admin role only)
```

### State Management

- **Server state**: TanStack Query (React Query) for all API data
- **Auth state**: Zustand store with localStorage persistence
- **UI state**: Local React state (no global UI state needed)

---

## Mobile Apps

Both iOS and Android apps follow the same architecture:

```
App Launch
    │
    ├── Auth (JWT from backend)
    │
    ├── Location Selection
    │
    ├── Get Stripe Terminal Connection Token (from backend)
    │       Backend calls: stripe.terminal.connectionTokens.create()
    │
    ├── Initialize Stripe Terminal SDK
    │
    ├── Discover readers / Enable Tap to Pay
    │
    ├── Product Selection → Cart
    │
    ├── Create Order (via backend API)
    │
    ├── Create PaymentIntent (via backend API)
    │       Backend returns: client_secret
    │
    ├── Terminal.collectPaymentMethod(clientSecret)
    │
    ├── Customer Taps Card/Phone
    │
    ├── Terminal.processPayment()
    │
    ├── Confirm with backend (POST /payments/confirm)
    │
    └── Stripe Webhook → Backend confirms final status
```

See [MOBILE_IOS.md](MOBILE_IOS.md) and [MOBILE_ANDROID.md](MOBILE_ANDROID.md) for platform-specific details.
