#!/bin/sh
set -e

echo "[AREENA Backend Entrypoint] Waiting for database to be ready..."
max_retries=30
count=0

until npx prisma db push --schema=apps/backend/prisma/schema.prisma --accept-data-loss; do
  count=$((count + 1))
  if [ $count -gt $max_retries ]; then
    echo "[AREENA Backend Entrypoint] Failed to connect to database after $max_retries attempts. Exiting."
    exit 1
  fi
  echo "[AREENA Backend Entrypoint] Database is initializing - retrying in 2s ($count/$max_retries)..."
  sleep 2
done

echo "[AREENA Backend Entrypoint] Database schema synchronized successfully!"

# Check if seed should run
echo "[AREENA Backend Entrypoint] Seeding initial federation data..."
npx ts-node -r dotenv/config apps/backend/prisma/seed.ts || echo "[AREENA Backend Entrypoint] Seed already applied or completed."

echo "[AREENA Backend Entrypoint] Starting AREENA Backend Service..."
exec node apps/backend/dist/server.js
