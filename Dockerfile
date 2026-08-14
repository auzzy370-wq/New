FROM node:20-alpine AS base
WORKDIR /app

# ── Install deps ──────────────────────────────────────────────
FROM base AS deps
COPY apps/backend/package.json ./
RUN npm install --legacy-peer-deps

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./
RUN npx prisma generate
RUN npx nest build

# ── Production image ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY apps/backend/package.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

CMD ["./docker-entrypoint.sh"]
