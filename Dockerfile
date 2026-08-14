FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ── Install deps ──────────────────────────────────────────────
FROM base AS deps
COPY apps/backend/package.json ./
RUN npm install --legacy-peer-deps

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./

# prisma generate only reads the schema; DATABASE_URL is only used at runtime.
# Set a placeholder so any version of Prisma CLI that validates the URL at
# generate-time doesn't fail the build.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate
RUN npx nest build

# ── Production image ──────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist       ./dist
COPY --from=builder /app/prisma     ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY apps/backend/package.json      ./
COPY docker-entrypoint.sh           ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3001/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["./docker-entrypoint.sh"]
