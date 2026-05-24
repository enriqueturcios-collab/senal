# ── Builder ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /build/public       ./public
COPY --from=builder /build/.next        ./.next
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./package.json

EXPOSE 3002
CMD ["node_modules/.bin/next", "start", "--port", "3002"]
