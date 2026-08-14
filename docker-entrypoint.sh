#!/bin/sh
set -e

# ── Wait for the database and run migrations (retries up to 60 s) ────────────
echo "→ Running database migrations (will retry if DB not ready)..."
MAX=30
i=0
until npx prisma migrate deploy 2>&1; do
  i=$((i + 1))
  [ "$i" -ge "$MAX" ] && echo "✗ Migration failed after $MAX attempts — aborting" && exit 1
  echo "  migration failed, retrying in 2 s (attempt $i/$MAX)..."
  sleep 2
done
echo "✓ Migrations applied"

# ── Seed demo data ───────────────────────────────────────────────────────────
echo "→ Seeding demo data..."
node dist/prisma/seed.js 2>/dev/null \
  || npx ts-node --transpile-only prisma/seed.ts 2>/dev/null \
  || echo "  Seed skipped (already seeded or ts-node unavailable)"

# ── Start API ────────────────────────────────────────────────────────────────
echo "→ Starting TapFlow API..."
exec node dist/main
