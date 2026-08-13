# Compliance Checklist

> **DISCLAIMER**: This document identifies compliance requirements. It does not provide legal advice. Consult qualified legal, financial, and compliance professionals before operating a payment platform.

---

## Payment Processor Requirements

### Stripe Connect Platform

- [ ] **Platform Application**: Complete Stripe's Connect platform review process at [dashboard.stripe.com/connect/overview](https://dashboard.stripe.com/connect/overview)
- [ ] **Platform Agreement**: Accept Stripe's Connect Account Agreement
- [ ] **Business Verification**: Complete Stripe's verification for the platform business
- [ ] **Use Case Documentation**: Provide Stripe with your platform use case description
- [ ] **Prohibited Businesses**: Review Stripe's list of prohibited businesses; ensure no merchants from prohibited categories are onboarded
- [ ] **Responsible Parties**: Identify and verify the platform's responsible parties per Stripe's requirements

### Stripe Terminal

- [ ] **Terminal Approval**: Ensure your Stripe account is approved for Terminal usage
- [ ] **Tap to Pay on iPhone**: Apply separately for Tap to Pay on iPhone entitlement through Stripe and Apple
- [ ] **Card-Present Compliance**: Review Stripe Terminal's card-present requirements

---

## KYC / KYB (Know Your Customer / Know Your Business)

> TapFlow POS delegates KYC/KYB to Stripe's hosted onboarding. We do NOT collect sensitive identity documents directly. This approach reduces our compliance burden significantly.

### What Stripe Handles:
- Identity verification (SSN, ITIN, or business EIN)
- Business registration verification
- Beneficial ownership verification
- Sanctions screening
- Bank account verification

### What We Must Ensure:
- [ ] Do not onboard merchants in Stripe-prohibited categories
- [ ] Implement merchant category codes (MCCs) correctly
- [ ] Monitor for suspicious transaction patterns
- [ ] Respond to Stripe's merchant verification requests
- [ ] Maintain records of merchant agreements

---

## PCI DSS

> Because TapFlow uses Stripe Terminal (a P2PE-validated solution), our PCI DSS scope is significantly reduced.

| Requirement | Status |
|---|---|
| Card data stored | **NEVER** - we never store PANs, CVVs, or magnetic stripe data |
| Card data transmitted | All card data goes directly through Stripe Terminal SDK |
| PCI P2PE | Stripe Terminal is EMVCo-compliant and handles encryption |
| PCI SAQ | Our scope is SAQ A (minimal) because we use hosted/integrated solutions |

### Actions Required:
- [ ] Complete PCI DSS SAQ A annually
- [ ] Conduct quarterly network vulnerability scans (if required by SAQ)
- [ ] Review your merchant bank's PCI requirements
- [ ] Document your PCI compliance policies

---

## Apple Tap to Pay Requirements

Before enabling Tap to Pay on iPhone, you must:

- [ ] **Apple Agreement**: Complete the [Tap to Pay on iPhone addendum](https://developer.apple.com/tap-to-pay-on-iphone/) with Apple
- [ ] **Stripe Approval**: Get Stripe's explicit approval for Tap to Pay on iPhone
- [ ] **Entitlement**: Obtain the `com.apple.developer.proximity-reader.payment.acceptance` entitlement from Apple
- [ ] **Provisioning Profile**: Add entitlement to your app's provisioning profile
- [ ] **Device Requirements**: iPhone XS or later, iOS 16+
- [ ] **App Review**: Apple App Store review with payment entitlement requires additional scrutiny
- [ ] **Privacy Policy**: Must clearly explain contactless payment data usage
- [ ] **Usage Description**: Required `NSProximityReaderUsageDescription` in Info.plist

---

## Google Play / Android Requirements

- [ ] **Payments Policy**: Review and comply with [Google Play Payments policy](https://play.google.com/about/developer-content-policy/)
- [ ] **Financial Services**: Financial services apps may require additional verification
- [ ] **NFC Permissions**: Declare `android.permission.NFC` and `android.permission.VIBRATE`
- [ ] **Device Compatibility**: Clearly communicate NFC requirement in app store listing
- [ ] **Security Review**: Apps handling payment tokens may require Google's security review

---

## Money Transmission / Payment Facilitator

> **IMPORTANT**: Operating a payment platform that processes funds on behalf of merchants may subject you to money transmission licensing requirements in various jurisdictions.

### Questions to Answer with Legal Counsel:
1. Does our platform make us a "payment facilitator" under applicable law?
2. Do we need money transmitter licenses (MTLs) in each US state where we operate?
3. Do we qualify for any exemptions (e.g., bank sponsorship through Stripe)?
4. What are our reporting obligations (FinCEN, SAR, CTR)?
5. Are there any international regulatory requirements for our merchant locations?

### Stripe's Role:
Stripe is a licensed money transmitter. When using Stripe Connect, Stripe handles many regulatory obligations. However:
- You as the platform may still have obligations depending on how funds flow
- Consult legal counsel for your specific situation

---

## Tax Requirements

- [ ] **1099-K Reporting**: Understand your obligations for IRS 1099-K reporting for merchants
- [ ] **Sales Tax**: Merchants are responsible for their own sales tax. Our platform records tax amounts but is not a tax processor.
- [ ] **Platform Income**: Report platform fee income and subscription income per applicable tax laws
- [ ] **Foreign Merchants**: Additional requirements may apply for merchants in other countries

---

## Data Privacy

- [ ] **Privacy Policy**: Create a comprehensive privacy policy covering payment data, merchant data, and customer data
- [ ] **GDPR**: If serving European merchants or customers, implement GDPR compliance (data subject requests, DPO if required)
- [ ] **CCPA**: If serving California businesses/consumers, implement CCPA compliance
- [ ] **Data Retention**: Define and implement data retention policies
- [ ] **Right to Erasure**: Implement ability to delete customer/merchant data while retaining required financial records
- [ ] **Breach Notification**: Implement breach detection and notification procedures

---

## Fraud Prevention

- [ ] **Transaction Monitoring**: Implement velocity rules and fraud detection
- [ ] **Chargeback Management**: Process dispute evidence within Stripe's deadlines (typically 7-21 days)
- [ ] **Risk Scoring**: Consider integrating Stripe Radar for enhanced fraud detection
- [ ] **Merchant Monitoring**: Monitor for unusual transaction patterns
- [ ] **Reserve Policy**: Consider implementing rolling reserves for high-risk merchants

---

## Operational Requirements

- [ ] **Terms of Service**: Merchant Terms of Service covering:
  - Prohibited products/services
  - Platform fee disclosure ($25/month + 1%)
  - Payout schedule
  - Dispute/chargeback procedures
  - Account suspension policies
- [ ] **Acceptable Use Policy**: Define prohibited use cases
- [ ] **Support SLA**: Define merchant support response times
- [ ] **Incident Response Plan**: Documented procedures for payment outages
- [ ] **Business Continuity**: Procedures if Stripe has an outage

---

## Pre-Launch Checklist

### Technical
- [ ] All webhook events handled and verified
- [ ] Idempotency keys implemented on all payment operations
- [ ] No sensitive data logged
- [ ] Rate limiting enabled
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured (helmet.js)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma parameterized queries)

### Business
- [ ] Stripe Connect platform application approved
- [ ] Legal entity formed
- [ ] Bank account connected to Stripe
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support system in place

### Mobile (iOS)
- [ ] Tap to Pay entitlement obtained from Apple
- [ ] Stripe Tap to Pay approval obtained
- [ ] App Store developer account active
- [ ] App Store Connect configuration complete
- [ ] Privacy Manifest file included
- [ ] App Privacy labels accurate

### Mobile (Android)
- [ ] Google Play developer account active
- [ ] Data safety section completed
- [ ] Financial services compliance (if required by Google)
