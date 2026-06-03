# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install ALL deps (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
# NOTE: prisma generate does NOT connect to DB — it only reads the schema.
# We pass a dummy DATABASE_URL so the schema validation passes.
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests
COPY package.json pnpm-lock.yaml ./

# Install production-only deps (includes @prisma/client and runtime packages)
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# IMPORTANT: Copy generated Prisma client — this contains the wasm + runtime files
# that @prisma/client-runtime-utils would otherwise be resolved from
COPY --from=builder /app/app/models/generated ./app/models/generated

# Copy the Prisma schema (needed for migrations at runtime if any)
COPY --from=builder /app/app/models/schema.prisma ./app/models/schema.prisma

# Copy public assets
COPY --from=builder /app/public ./public

# Copy node_modules/@prisma from builder to ensure runtime sub-packages are present
# (@prisma/client-runtime-utils is a sub-package installed alongside @prisma/client)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose port (Railway injects PORT env variable automatically)
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
