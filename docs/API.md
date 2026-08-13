# API Reference

## Base URL

```
Development: http://localhost:3001/api/v1
Staging: https://api-staging.tapflow.app/api/v1
Production: https://api.tapflow.app/api/v1
```

## Interactive Documentation

Swagger UI is available in non-production environments:
```
http://localhost:3001/api/docs
```

## Authentication

All endpoints (except public ones) require a JWT Bearer token:
```
Authorization: Bearer <access_token>
```

Merchant-scoped endpoints also require a merchant context:
```
X-Merchant-ID: <merchant_uuid>
```

Idempotent operations should include:
```
X-Idempotency-Key: <unique_key>
```

## Auth Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |
| GET | `/auth/verify-email/:token` | Verify email |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/mfa/setup` | Initialize MFA |
| POST | `/auth/mfa/confirm` | Activate MFA |
| DELETE | `/auth/mfa` | Disable MFA |
| PATCH | `/auth/switch-merchant/:id` | Switch merchant context |

## Merchant Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/merchants` | Create merchant |
| GET | `/merchants/me` | Get user's merchants |
| GET | `/merchants/:id` | Get merchant |
| PUT | `/merchants/:id` | Update merchant |
| GET | `/merchants/:id/onboarding` | Get onboarding status |
| POST | `/merchants/:id/stripe/onboard` | Start Stripe Connect |
| GET | `/merchants/:id/stripe/return` | Handle Stripe return |
| GET | `/merchants/:id/stripe/dashboard` | Stripe dashboard link |

## Product Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/products` | List products (paginated) |
| POST | `/products` | Create product |
| GET | `/products/:id` | Get product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| GET | `/products/categories` | List categories |
| POST | `/products/categories` | Create category |

## Order Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/orders` | List orders |
| POST | `/orders` | Create order |
| GET | `/orders/stats` | Get order statistics |
| GET | `/orders/:id` | Get order |
| PUT | `/orders/:id/status` | Update order status |

## Payment Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/payments/create` | Create payment intent (card-present) |
| POST | `/payments/cash` | Process cash payment |
| POST | `/payments/confirm/:paymentIntentId` | Confirm terminal payment |
| GET | `/payments/:id` | Get payment |

## Refund Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/refunds` | Create refund |
| GET | `/refunds` | List refunds |

## Subscription Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/subscriptions` | Get subscription |
| POST | `/subscriptions` | Create subscription |
| DELETE | `/subscriptions` | Cancel subscription |
| GET | `/subscriptions/invoices` | List invoices |

## Webhook Endpoint

| Method | Path | Description |
|---|---|---|
| POST | `/webhooks/stripe` | Stripe webhooks (no auth, signature verified) |

## Report Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/reports/dashboard` | Dashboard metrics |
| GET | `/reports/sales` | Sales report |
| GET | `/reports/revenue` | Revenue report |

## Admin Endpoints (Platform Admin Only)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/merchants` | List all merchants |
| POST | `/admin/merchants/:id/suspend` | Suspend merchant |
| POST | `/admin/merchants/:id/activate` | Activate merchant |
| GET | `/admin/webhooks/stats` | Webhook statistics |
| GET | `/admin/revenue` | Platform revenue |

## Response Format

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Paginated:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Error:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [ ... ],
  "path": "/api/v1/orders",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Rate Limits

| Endpoint Category | Limit |
|---|---|
| All endpoints | 300 req/min |
| Authentication | 10 req/min |
| Registration | 3 req/min |
| Password reset | 3 req/min |
