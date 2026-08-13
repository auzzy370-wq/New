# TapFlow POS

**Production-ready SaaS Point of Sale platform with Tap to Pay support.**

TapFlow POS is a full-stack, multi-tenant SaaS platform combining the best concepts of modern POS systems with a powerful merchant-management platform. Built with Stripe Connect + Stripe Terminal for real in-person payments including NFC/contactless Tap to Pay.

---

## Business Model

| Revenue Stream | Amount |
|---|---|
| Monthly subscription per merchant | **$25/month** |
| Platform fee on transactions | **1% of gross** |

**Example:** 1,000 merchants, $1M/month transaction volume
- Subscription revenue: $25,000/month
- Transaction fee revenue: $10,000/month
- **Total platform revenue: $35,000/month**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | NestJS, TypeScript, Node.js |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Cache / Queue** | Redis 7, BullMQ |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **iOS POS** | Swift, SwiftUI, Stripe Terminal SDK |
| **Android POS** | Kotlin, Jetpack Compose, Stripe Terminal SDK |
| **Payments** | Stripe Connect, Stripe Terminal, Stripe Subscriptions |
| **Storage** | MinIO / S3-compatible |
| **Email** | SMTP (Nodemailer) / MailHog in dev |

---

## Project Structure

```
tapflow-pos/
├── apps/
│   ├── backend/          # NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/             # JWT + MFA authentication
│   │   │   ├── merchants/        # Multi-tenant merchant management
│   │   │   ├── locations/        # Multi-location support
│   │   │   ├── products/         # Product catalog + categories
│   │   │   ├── inventory/        # Real-time inventory tracking
│   │   │   ├── customers/        # CRM
│   │   │   ├── orders/           # Order lifecycle
│   │   │   ├── payments/         # Stripe Terminal payments
│   │   │   ├── refunds/          # Partial/full refunds
│   │   │   ├── subscriptions/    # $25/month billing
│   │   │   ├── webhooks/         # Stripe webhook processing
│   │   │   ├── reports/          # Analytics
│   │   │   ├── employees/        # RBAC employee management
│   │   │   ├── devices/          # Terminal device management
│   │   │   ├── registers/        # Cash register sessions
│   │   │   ├── admin/            # Platform admin dashboard
│   │   │   └── audit/            # Immutable audit logging
│   │   └── prisma/
│   │       └── schema.prisma     # Full database schema
│   ├── web/              # Next.js merchant dashboard + POS
│   ├── ios/              # Swift/SwiftUI iOS POS app
│   └── android/          # Kotlin/Compose Android POS app
├── packages/
│   └── shared/           # Shared TypeScript types
├── docker/               # Docker configuration files
├── docs/                 # Documentation
├── docker-compose.yml    # Development infrastructure
└── docker-compose.prod.yml
```

---

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/yourorg/tapflow-pos.git
cd tapflow-pos
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d
# Starts: PostgreSQL, Redis, MailHog, MinIO
```

### 3. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local

# Edit apps/backend/.env:
# - Set STRIPE_SECRET_KEY (from https://dashboard.stripe.com)
# - Set STRIPE_WEBHOOK_SECRET
# - Set STRIPE_SUBSCRIPTION_PRICE_ID
# - JWT_SECRET and JWT_REFRESH_SECRET (generate random 64-char strings)
```

### 4. Set up database

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start development servers

```bash
pnpm dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
# API Docs: http://localhost:3001/api/docs
# MailHog: http://localhost:8025
# MinIO: http://localhost:9001
```

### 6. Set up Stripe webhooks (local)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env
```

---

## Required Credentials

Before the platform works end-to-end, you must configure:

| Credential | Where to Get | Where to Set |
|---|---|---|
| `STRIPE_SECRET_KEY` | [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys) | `apps/backend/.env` |
| `STRIPE_WEBHOOK_SECRET` | [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks) | `apps/backend/.env` |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | Create $25/mo price at [Stripe Products](https://dashboard.stripe.com/products) | `apps/backend/.env` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys) | `apps/web/.env.local` |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | `apps/backend/.env` |
| `JWT_REFRESH_SECRET` | Same as above (different value) | `apps/backend/.env` |

---

## API Documentation

When running in development, the Swagger API docs are available at:
```
http://localhost:3001/api/docs
```

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete system design.

---

## Compliance & Legal

**This software does not make your business compliant by itself.**

Before accepting live payments, you must:

1. Complete Stripe's platform review / application process
2. Accept Stripe's Connect platform agreement
3. Complete your own business's KYC/KYB through Stripe
4. Complete Tap to Pay on iPhone agreement (Apple)
5. Review PCI DSS requirements for your use case
6. Consult legal counsel regarding money-transmission laws in your jurisdiction
7. Review App Store and Google Play payment-related policies

See [docs/COMPLIANCE.md](docs/COMPLIANCE.md) for the complete compliance checklist.

---

## License

Proprietary. All rights reserved.
