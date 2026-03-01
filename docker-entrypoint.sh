#!/bin/sh

set -e

echo "🚀 Starting backend..."

echo "📦 Running Prisma migrate deploy..."
npx prisma migrate deploy

echo "🔎 Checking if User table has data..."

USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then((count) => { console.log(count); })
  .catch(() => { console.log(0); })
  .finally(async () => { await prisma.$disconnect(); });
")

USER_COUNT=$(echo "$USER_COUNT" | tr -d '[:space:]')

if [ "$USER_COUNT" = "0" ]; then
  echo "🌱 Database empty → running seed..."
  node seed-test-exam.js
else
  echo "✅ Database already seeded → skipping seed"
fi

echo "🔥 Starting NestJS..."
node dist/main.js
