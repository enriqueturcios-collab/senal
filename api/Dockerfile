# ── Builder ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# argon2 needs build tools for native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache python3 make g++

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /build/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
