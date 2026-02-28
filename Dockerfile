# ==============================
# Stage 1 — Build
# ==============================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Cài openssl (đảm bảo runtime detect đúng)
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./

# Cài dependencies chuẩn CI
RUN npm ci

# Copy prisma trước để generate engine
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Clean build cache to ensure fresh compilation
RUN rm -f tsconfig.build.tsbuildinfo

# Build NestJS
RUN npm run build


# ==============================
# Stage 2 — Runtime
# ==============================
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl

# Copy từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
