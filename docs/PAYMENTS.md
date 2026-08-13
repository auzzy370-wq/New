# Payment Architecture

## Overview

TapFlow POS uses **Stripe Connect** (Express accounts) + **Stripe Terminal** for all card-present payments.

The 1% platform fee is implemented using Stripe's official `application_fee_amount` parameter. Funds flow directly to the merchant's Stripe Express account. The platform fee is automatically deducted by Stripe and deposited to the platform's Stripe account.

---

## Fund Flow

```
Customer pays $100.00
    │
    ▼
Stripe Terminal processes payment
    │
    ▼
Stripe routes:
    ├── $99.00 → Merchant's Stripe Express account (payout to bank)
    └──  $1.00 → TapFlow platform Stripe account (1% application fee)
    
    Note: Stripe's processing fee (e.g. ~2.6% + $0.10 for card-present)
    is deducted from the merchant's $99.00 by Stripe.
    The exact processor fee depends on your Stripe plan.
```

---

## Stripe Connect Setup

### 1. Create a Stripe Platform Account

1. Create/use a Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Enable Connect at [dashboard.stripe.com/connect/overview](https://dashboard.stripe.com/connect/overview)
3. Complete the Connect platform application (required before going live)

### 2. Configure Connect Settings

In the Stripe Dashboard:
- Set branding (logo, colors)
- Configure payout schedule
- Set required verification information
- Enable Express account type

### 3. Merchant Onboarding (Stripe Connect Express)

When a merchant signs up, our backend:
1. Creates a Stripe Express account (`stripe.accounts.create`)
2. Generates an Account Link for Stripe's hosted onboarding
3. Merchant completes Stripe's KYC/KYB directly on Stripe's hosted page
4. Webhook `account.updated` confirms when onboarding is complete

### 4. Capabilities Required

Each connected account must have:
- `card_payments`: `active`
- `transfers`: `active`

---

## Stripe Terminal Setup

### 1. Terminal Account Setup

Terminal must be enabled for your Stripe platform account. Contact Stripe if not available.

### 2. Terminal Locations

Each merchant location gets a Stripe Terminal Location:
```typescript
stripe.terminal.locations.create({
  display_name: location.name,
  address: { ... },
}, {
  stripeAccount: merchant.stripeAccountId,
})
```

### 3. Connection Tokens

The mobile app requests a connection token from our backend each session:
```typescript
// Backend
stripe.terminal.connectionTokens.create(
  { location: stripeLocationId },
  { stripeAccount: connectedAccountId }
)
// Returns: { secret: "..." }
// This secret is returned to the mobile app
```

### 4. Tap to Pay on iPhone

**IMPORTANT REQUIREMENTS:**
1. You must have an approved Apple Tap to Pay account
2. Your Stripe account must be approved for Tap to Pay on iPhone
3. Your iOS app must be approved by Apple for the Tap to Pay entitlement
4. The entitlement `com.apple.developer.proximity-reader.payment.acceptance` must be in your provisioning profile

See [MOBILE_IOS.md](MOBILE_IOS.md) for the full iOS setup guide.

### 5. Tap to Pay on Android

Android Tap to Pay requirements:
- Supported Android device with NFC
- Android 9+ (API 28+)
- Google Play Services installed
- Stripe Terminal Android SDK
- Device must pass Stripe's compatibility check

---

## Payment Intent Lifecycle

```
1. POST /payments/create
   → Creates PaymentIntent on Stripe (via our backend)
   → Returns client_secret to mobile app
   → Order status: PENDING

2. Mobile: terminal.collectPaymentMethod(clientSecret)
   → Customer taps card/phone

3. Mobile: terminal.processPayment(paymentIntent)
   → Terminal processes the tap

4. POST /payments/confirm/:paymentIntentId
   → Backend retrieves PaymentIntent from Stripe
   → If succeeded: updates payment + order status

5. Stripe Webhook: payment_intent.succeeded
   → Secondary confirmation
   → Updates platform fee record
   → Triggers inventory update
   → Updates customer stats
```

### Why Both Step 4 and Step 5?

- Step 4 provides immediate confirmation to the mobile app
- Step 5 is the authoritative confirmation (webhooks are reliable)
- Both are idempotent - duplicate processing is safe

---

## Idempotency

Every payment request includes an idempotency key:

```typescript
// Mobile app generates:
const idempotencyKey = `pi-${orderId}-${deviceId}-${timestamp}`;

// Sent in header:
'X-Idempotency-Key': idempotencyKey

// Backend caches result for 24 hours:
redis.setex(`idempotency:${key}`, 86400, JSON.stringify(result))
```

If the same key is received again, the cached result is returned immediately without creating a new charge.

---

## Refunds

```typescript
// Backend creates refund via Stripe
stripe.refunds.create({
  charge: stripeChargeId,
  amount: refundAmountCents, // partial or full
  reason: 'requested_by_customer',
}, {
  stripeAccount: merchant.stripeAccountId,
  idempotencyKey: `refund-${refundId}`,
})
```

Platform fee refunds: When a payment is refunded, Stripe automatically returns the proportional application fee.

---

## Subscriptions ($25/month)

```typescript
// 1. Create Stripe Customer for merchant
stripe.customers.create({ email, name, metadata: { merchantId } })

// 2. Create Subscription
stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: STRIPE_SUBSCRIPTION_PRICE_ID }],
  trial_period_days: 14, // 14-day free trial
  metadata: { merchantId },
})
```

The subscription is managed entirely by Stripe:
- Automatic monthly billing
- Retry logic on payment failure
- Grace period handling (via `customer.subscription.updated` webhook)

---

## Webhook Events Handled

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Mark payment/order PAID, record platform fee |
| `payment_intent.payment_failed` | Mark payment/order FAILED |
| `payment_intent.canceled` | Mark payment CANCELLED |
| `charge.dispute.created` | Create dispute record, alert merchant |
| `charge.dispute.closed` | Update dispute status |
| `customer.subscription.created` | Record subscription |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Cancel subscription |
| `invoice.payment_succeeded` | Record invoice paid |
| `invoice.payment_failed` | Set subscription to past_due |
| `account.updated` | Sync merchant Stripe account status |

---

## Required Stripe Configuration

Before going live, configure in Stripe Dashboard:

1. **Connect platform settings**
   - Application name, website, redirect URIs
   - Support email and phone
   - Privacy policy and ToS URLs

2. **Webhook endpoints**
   - Create endpoint at: `https://yourdomain.com/api/webhooks/stripe`
   - Subscribe to all events listed above
   - Save the signing secret to `STRIPE_WEBHOOK_SECRET`

3. **Subscription product + price**
   - Create product: "TapFlow POS Subscription"
   - Create recurring price: $25.00/month USD
   - Save price ID to `STRIPE_SUBSCRIPTION_PRICE_ID`

4. **Stripe Terminal**
   - Enable Terminal in your platform settings
   - Apply for Tap to Pay on iPhone (if supporting iOS)
