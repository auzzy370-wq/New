#!/bin/sh
set -e

# Inline fallback — used when Render doesn't inject DATABASE_URL
DATABASE_URL="${DATABASE_URL:-postgresql://neondb_owner:npg_7NEwOIS4mfWv@ep-withered-sea-axy6hrvt.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require}"
export DATABASE_URL

echo "→ Running database migrations..."
MAX=30
i=0
until npx prisma migrate deploy 2>&1; do
  i=$((i + 1))
  [ "$i" -ge "$MAX" ] && echo "✗ Migration failed after $MAX attempts" && exit 1
  echo "  retrying in 2s (attempt $i/$MAX)..."
  sleep 2
done
echo "✓ Migrations applied"

echo "→ Seeding demo data..."
node dist/prisma/seed.js 2>/dev/null \
  || npx tsx prisma/seed.ts 2>/dev/null \
  || echo "  Seed skipped (already seeded)"

echo "→ Starting TapFlow API..."
exec node dist/main
