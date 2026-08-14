#!/bin/sh
set -e

# ── Verify DATABASE_URL is present ───────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "================================================================"
  echo "✗  DATABASE_URL is not set."
  echo ""
  echo "   Fix options:"
  echo "   1. In Render dashboard → tapflow-api → Environment, add:"
  echo "      DATABASE_URL = <your postgres connection string>"
  echo ""
  echo "   Free Postgres providers:"
  echo "     • https://neon.tech   (free tier, 0.5 GB)"
  echo "     • https://supabase.com (free tier, 500 MB)"
  echo "================================================================"
  exit 1
fi

# ── Wait for Postgres and run migrations (retries for up to 60 s) ────────────
echo "→ Running database migrations..."
MAX=30
i=0
until npx prisma migrate deploy 2>&1; do
  i=$((i + 1))
  [ "$i" -ge "$MAX" ] && echo "✗ Migration failed after $MAX attempts — check DATABASE_URL" && exit 1
  echo "  not ready yet, retrying in 2 s (attempt $i/$MAX)..."
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
