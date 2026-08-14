#!/bin/sh
set -e

echo "→ Running database migrations..."
npx prisma migrate deploy

echo "→ Seeding demo data (safe to re-run)..."
npx ts-node --transpile-only prisma/seed.ts || echo "Seed skipped (already seeded or ts-node unavailable)"

echo "→ Starting TapFlow API..."
exec node dist/main
