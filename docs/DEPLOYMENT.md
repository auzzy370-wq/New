# Deployment Guide

## Environments

| Environment | Purpose | Stripe Mode |
|---|---|---|
| Development | Local development | Test keys (`sk_test_...`) |
| Staging | Pre-production testing | Test keys |
| Production | Live merchants | Live keys (`sk_live_...`) |

**NEVER use live Stripe keys in development or staging.**

---

## Local Development

See [README.md](../README.md#quick-start-development) for the full local setup guide.

### Quick start
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Set up environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your Stripe test keys

# 3. Run migrations
cd apps/backend && pnpm db:migrate

# 4. Start servers
pnpm dev
```

---

## Production Deployment

### Option A: Docker Compose (Single Server)

```bash
# 1. Configure environment
cp apps/backend/.env.example apps/backend/.env.production
cp apps/web/.env.example apps/web/.env.production
# Fill in production values including live Stripe keys

# 2. Build and start
docker compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate:deploy

# 4. Verify health
curl https://yourdomain.com/health
```

### Option B: Kubernetes (Recommended for Scale)

Deploy each service as a Kubernetes Deployment:
- `tapflow-backend` (3+ replicas)
- `tapflow-web` (2+ replicas)
- `tapflow-worker` (2+ replicas)

Use managed services for:
- PostgreSQL: RDS, Cloud SQL, or Supabase
- Redis: ElastiCache, Upstash, or Redis Cloud

### Option C: PaaS (Render, Railway, Fly.io)

Works well for smaller deployments:
1. Deploy backend as a web service
2. Deploy web as a web service
3. Use managed PostgreSQL and Redis from provider

---

## Infrastructure Requirements (Production)

### Minimum Production Setup

| Service | Minimum Spec |
|---|---|
| Backend API | 2 vCPU, 2GB RAM |
| Worker | 1 vCPU, 1GB RAM |
| Web (Next.js) | 1 vCPU, 1GB RAM |
| PostgreSQL | db.t3.medium (2 vCPU, 4GB) |
| Redis | cache.t3.micro (2 vCPU, 0.5GB) |

### Recommended Production Setup (1000+ merchants)

| Service | Recommended Spec |
|---|---|
| Backend API | 4 vCPU, 8GB RAM (3+ replicas) |
| Worker | 2 vCPU, 4GB RAM (2+ replicas) |
| Web (Next.js) | 2 vCPU, 4GB RAM (2+ replicas) |
| PostgreSQL | db.r6g.xlarge (4 vCPU, 32GB) + read replica |
| Redis | cache.r6g.large (2 vCPU, 13GB) |
| Load Balancer | ALB / Nginx |
| CDN | CloudFront / Fastly for static assets |

---

## Database Migrations

### Development
```bash
# Create a new migration
cd apps/backend
pnpm db:migrate  # prompts for migration name

# Reset database (dev only)
pnpm db:reset
```

### Production
```bash
# Deploy migrations (non-destructive only)
cd apps/backend
pnpm db:migrate:deploy

# NEVER run db:reset in production
```

### Migration Safety Rules
- Only additive migrations in production (new tables, new columns)
- Never drop columns without a data migration plan
- Test migrations on staging before production
- Always backup before deploying migrations

---

## Environment Variables (Production)

### Backend (.env.production)

```bash
NODE_ENV=production
PORT=3001

# Use your production PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/tapflow_prod?sslmode=require

# Redis (with TLS in production)
REDIS_HOST=your-redis-host
REDIS_PORT=6380  # TLS port
REDIS_PASSWORD=strong-redis-password

# JWT - Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=64-char-random-hex-string
JWT_REFRESH_SECRET=different-64-char-random-hex-string

# Stripe - USE LIVE KEYS IN PRODUCTION
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
STRIPE_SUBSCRIPTION_PRICE_ID=price_your_production_price_id

FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com

# Production SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com

# S3
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_ACCESS_KEY=your-aws-access-key
STORAGE_SECRET_KEY=your-aws-secret-key
STORAGE_BUCKET=tapflow-production
STORAGE_REGION=us-east-1
```

---

## Monitoring

### Health Check
The backend exposes a health endpoint:
```
GET /health
→ { "status": "ok", "services": { "database": "ok", "redis": "ok" } }
```

### Recommended Monitoring Stack
- **Uptime**: Better Uptime, Pingdom, or UptimeRobot
- **APM**: Datadog, New Relic, or Sentry
- **Logs**: Papertrail, Logtail, or CloudWatch
- **Metrics**: Prometheus + Grafana

### Key Metrics to Monitor
- API response time (p50, p95, p99)
- Payment success rate
- Webhook processing lag
- Database connection pool
- Redis memory usage
- Failed job queue depth

---

## SSL/TLS

All production traffic must use HTTPS.

### Using Let's Encrypt (Nginx)
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Using AWS ACM
Request certificate in ACM and attach to load balancer.

---

## Backup Strategy

### Database Backups
- Daily automated backups (minimum 30-day retention)
- Point-in-time recovery enabled
- Test restore procedure quarterly

### Application Data
- Product images in S3 (versioning enabled)
- No application state outside DB + Redis

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Database migrations tested on staging
- [ ] Environment variables verified (especially live Stripe keys)
- [ ] Stripe webhook endpoint updated to production URL
- [ ] SSL certificate valid
- [ ] DNS configured
- [ ] Health check responding
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured
- [ ] Runbook for common incidents written
