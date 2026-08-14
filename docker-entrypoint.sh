#!/bin/sh
set -e

echo "=== TapFlow API Startup ==="
echo "NODE_ENV: ${NODE_ENV}"
echo "PORT: ${PORT:-3001}"

# Use provided DATABASE_URL or fall back to Neon
DATABASE_URL="${DATABASE_URL:-postgresql://neondb_owner:npg_7NEwOIS4mfWv@ep-withered-sea-axy6hrvt.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30}"
export DATABASE_URL

echo "→ Running database migrations..."
i=0
MAX=60
until npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge "$MAX" ]; then
    echo "✗ Migration failed after $MAX attempts — starting app anyway"
    break
  fi
  echo "  retrying in 2s (attempt $i/$MAX)..."
  sleep 2
done
echo "✓ Migrations done"

echo "→ Seeding demo data..."
node dist/prisma/seed.js 2>/dev/null \
  || echo "  Seed skipped"

echo "→ Starting TapFlow API on port ${PORT:-3001}..."
exec node dist/src/main
