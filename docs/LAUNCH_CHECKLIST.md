# Launch Checklist

## Phase 1: Infrastructure ✅
- [x] Repository structure (monorepo)
- [x] Docker Compose (dev environment)
- [x] PostgreSQL schema (Prisma)
- [x] Redis setup
- [x] NestJS backend foundation
- [x] Next.js frontend foundation
- [x] Authentication (JWT + refresh + MFA)
- [x] Multi-tenancy architecture

## Phase 2: Merchant Onboarding ✅
- [x] Onboarding wizard (15-step flow) - /onboarding
- [x] Stripe Connect integration (NEEDS: Stripe platform account + `STRIPE_SECRET_KEY`)
- [x] $25/month subscription setup (NEEDS: `STRIPE_SUBSCRIPTION_PRICE_ID`)
- [x] Setup intents for payment method collection
- [x] Stripe Billing Portal integration
- [x] Subscription reactivation + cancellation
- [x] Merchant settings page
- [x] Locations management (full CRUD)
- [x] Billing invoices page

## Phase 3: Core Commerce
- [x] Product catalog (backend)
- [x] Category management
- [x] Inventory management
- [x] Customer CRM
- [x] Order creation

## Phase 4: Payments
- [x] Stripe Terminal payment intents (backend)
- [x] Cash payment processing
- [x] Webhook processing
- [x] Refunds
- [x] Platform fee recording
- [ ] Full POS Tap to Pay flow testing (NEEDS: Stripe account + approved device)

## Phase 5: Mobile Apps
- [ ] iOS app (Swift/SwiftUI) - See MOBILE_IOS.md
- [ ] Android app (Kotlin/Compose) - See MOBILE_ANDROID.md
- [ ] Tap to Pay on iPhone (NEEDS: Apple + Stripe approval)
- [ ] Tap to Pay on Android

## Phase 6: Analytics & Reporting
- [x] Dashboard metrics (backend)
- [x] Sales reports
- [x] Revenue reports
- [ ] Charts and visualizations (frontend)
- [ ] Export functionality

## Phase 7: Admin Dashboard
- [x] Admin API (backend)
- [ ] Admin frontend

## Phase 8: Security Hardening
- [x] Rate limiting
- [x] Input validation
- [x] SQL injection prevention (Prisma)
- [x] XSS protection (helmet)
- [x] CSRF protection
- [ ] Penetration testing
- [ ] Security audit

## Phase 9: App Store Preparation
- [ ] Apple Developer Account ($99/year)
- [ ] Tap to Pay entitlement (apply at developer.apple.com)
- [ ] App Store Connect configuration
- [ ] Google Play Console setup
- [ ] Privacy policy (required for both stores)
- [ ] App privacy labels (iOS)
- [ ] Data safety form (Android)

## Phase 10: Production Launch
- [ ] DNS configuration
- [ ] SSL certificates
- [ ] Production database (managed PostgreSQL)
- [ ] Production Redis
- [ ] SMTP configuration (SendGrid/Mailgun)
- [ ] S3 configuration
- [ ] Monitoring setup (Datadog/Sentry)
- [ ] Backup configuration
- [ ] Stripe platform application APPROVED
- [ ] Stripe webhook endpoint registered (production URL)
- [ ] Stripe live keys configured
- [ ] Legal: Terms of Service published
- [ ] Legal: Privacy Policy published
- [ ] Legal: Consulted on money transmission requirements
- [ ] Compliance: PCI SAQ completed
- [ ] Compliance: Apple Tap to Pay agreement signed
- [ ] CI/CD pipeline configured
- [ ] Team trained on incident response procedures

## Credentials Required Before Launch

| Credential | Status | Notes |
|---|---|---|
| Stripe Secret Key (live) | ❌ Required | Get at dashboard.stripe.com |
| Stripe Webhook Secret (live) | ❌ Required | Register production webhook |
| Stripe Subscription Price ID | ❌ Required | Create $25/month price |
| Stripe Connect Platform Approval | ❌ Required | Apply for Connect |
| Apple Developer Account | ❌ Required | $99/year |
| Apple Tap to Pay Entitlement | ❌ Required | Apply separately |
| Google Play Console Account | ❌ Required | $25 one-time |
| Production PostgreSQL | ❌ Required | Managed service recommended |
| Production Redis | ❌ Required | Managed service recommended |
| SMTP Provider | ❌ Required | SendGrid, Mailgun, etc. |
| Domain + SSL Certificate | ❌ Required | |
