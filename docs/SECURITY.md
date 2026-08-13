# Security Architecture

## Authentication

### JWT Strategy
- **Access tokens**: Short-lived (15 minutes), signed with HS256, stored in memory on client
- **Refresh tokens**: Long-lived (30 days), stored as httpOnly cookie, rotated on each use
- **Token rotation**: When a refresh token is used, it is invalidated and a new one is issued
- **Token reuse detection**: If a revoked refresh token is used (indicating theft), the entire token family is invalidated
- **Token blacklisting**: Redis-backed blacklist for immediate logout

### Password Security
- Argon2id hashing (argon2id with memoryCost=64MB, timeCost=3, parallelism=1)
- Minimum 8 characters, requires upper/lower/number
- Password reset tokens are single-use and expire in 1 hour
- All password reset tokens are rotated on use

### Multi-Factor Authentication
- TOTP (Time-based One-Time Password) via RFC 6238
- QR code enrollment via `otplib`
- 8 single-use backup codes provided at enrollment
- Backup codes are hashed, consumed on use

---

## API Security

### Rate Limiting
| Endpoint Type | Rate Limit |
|---|---|
| All endpoints | 300 req/min |
| Authentication | 10 req/min |
| Registration | 3 req/min |
| Password reset | 3 req/min |

### Input Validation
All request bodies are validated via `class-validator` decorators in NestJS DTOs.
- Whitelist: unknown properties are stripped
- Forbid non-whitelisted: returns error on unknown fields
- Transform: type coercion enabled

### Headers (helmet.js)
```
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer-when-downgrade
Content-Security-Policy: default-src 'self' ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Multi-Tenant Isolation

Every API request to a merchant-scoped endpoint:
1. Requires a valid JWT (`JwtAuthGuard`)
2. Requires a valid merchant context (`MerchantGuard`)
3. The merchant guard verifies the user belongs to the claimed merchant
4. All database queries include `merchantId` filter
5. Platform admin role bypasses tenant check (admin-only endpoints have `AdminOnly()`)

### Example Query Pattern
```typescript
// ❌ NEVER do this (returns all merchants' data)
await prisma.order.findMany();

// ✅ Always scope by merchantId
await prisma.order.findMany({ where: { merchantId, id } });
```

---

## Payment Security

| Concern | Mitigation |
|---|---|
| Card data storage | Never stored - Stripe handles all card data |
| Secret key exposure | Backend-only, never in mobile app or frontend |
| Double charging | Idempotency keys on all payment requests |
| Webhook forgery | HMAC signature verification on all webhooks |
| Payment status spoofing | Server never trusts client for payment status |
| Refund abuse | Maximum refundable amount enforced server-side |

---

## Database Security

- All queries via Prisma ORM (parameterized queries - SQL injection prevention)
- No raw SQL with user input (only in safe aggregation contexts)
- PostgreSQL roles: application user has limited permissions (no DROP, no schema changes)
- Passwords and secrets never stored in plaintext
- `mfaSecret` and `mfaBackupCodes` excluded from all response DTOs

---

## Secrets Management

### Development
- Use `.env` files (not committed to git)
- `.env.example` shows all required variables

### Production
- Use environment variables injected by your hosting platform
- Consider a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler)
- Never hardcode secrets in code
- Rotate secrets periodically (JWT secrets, webhook secrets)

### Critical Secrets
| Secret | Rotation Frequency |
|---|---|
| JWT_SECRET | Quarterly or on suspected compromise |
| JWT_REFRESH_SECRET | Quarterly |
| STRIPE_SECRET_KEY | Only if compromised (generates new key) |
| STRIPE_WEBHOOK_SECRET | On new webhook endpoint creation |
| Database password | Annually or on suspected compromise |

---

## Audit Logging

All financial and administrative events are logged to the `audit_logs` table:

```typescript
// Every payment operation
await auditService.log({
  merchantId,
  userId,
  action: AuditAction.PAYMENT_CREATE,
  resource: 'payment',
  resourceId: payment.id,
  before: undefined,
  after: { amount, orderId },
  ipAddress: request.ip,
});
```

Audit logs are:
- Append-only (no updates or deletes)
- Include before/after values for sensitive changes
- Include IP address and user agent where applicable
- Retained per your data retention policy (minimum 7 years for financial records)

---

## CORS Configuration

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','), // Explicit whitelist
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
});
```

Wildcard origins (`*`) are never used.

---

## Security Checklist for Production

- [ ] HTTPS enforced (TLS 1.2+ only)
- [ ] Strong JWT secrets (64+ random characters)
- [ ] Database TLS connection enabled
- [ ] Redis AUTH enabled
- [ ] Rate limiting configured
- [ ] Security headers verified with [securityheaders.com](https://securityheaders.com)
- [ ] Dependency vulnerabilities scanned (`pnpm audit`)
- [ ] No secrets in git history
- [ ] Database backups encrypted
- [ ] Logs do not contain sensitive data (payment credentials, PII in excess)
- [ ] Admin endpoints have additional authentication
