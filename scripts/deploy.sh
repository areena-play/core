#!/usr/bin/env bash
set -e

BRANCH="${1:-main}"
PROJECT_NAME="${2:-areena-$BRANCH}"

echo "========================================="
echo "  Starting AREENA Deployment"
echo "  Branch:       $BRANCH"
echo "  Project Name: $PROJECT_NAME"
echo "  Prebuilt:     ${USE_PREBUILT_IMAGES:-false}"
echo "  Domain:       ${DOMAIN_NAME}"
echo "  Timestamp:    $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================="

# 1. Sync git branch
echo "📥 Fetching and syncing git branch (origin/$BRANCH)..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# 2. Ensure .env exists with restricted permissions
touch .env
chmod 600 .env

# Helper to safely set / update key-value pairs without regex escaping bugs
sync_var() {
    local var_name="$1"
    local var_value="$2"
    if [ -n "$var_value" ]; then
        if [ -f .env ]; then
            grep -v "^${var_name}=" .env > .env.tmp || true
            mv .env.tmp .env
        fi
        printf "%s=%s\n" "$var_name" "$var_value" >> .env
    fi
}

echo "🔐 Synchronizing environment variables from GitHub Secrets & Variables..."

# Application & Domain
sync_var "FRONTEND_PORT" "$FRONTEND_PORT"
sync_var "BACKEND_PORT" "$BACKEND_PORT"
sync_var "WS_PORT" "$WS_PORT"
sync_var "DOMAIN_NAME" "$DOMAIN_NAME"
sync_var "AREENA_SUPPORT_EMAIL" "$AREENA_SUPPORT_EMAIL"
sync_var "APP_BASE_URL" "$APP_BASE_URL"
sync_var "IS_DEMO" "$IS_DEMO"
sync_var "SERVER_NAME" "$SERVER_NAME"
sync_var "BACKEND_INTERNAL_URL" "$BACKEND_INTERNAL_URL"
sync_var "LETSENCRYPT_EMAIL" "$LETSENCRYPT_EMAIL"

# Database & Cache
sync_var "DATABASE_URL" "$DATABASE_URL"
sync_var "REDIS_URL" "$REDIS_URL"

# Security & Tokens
sync_var "JWT_SECRET" "$JWT_SECRET"

# Object Storage (S3 / MinIO)
sync_var "AWS_ENDPOINT" "$AWS_ENDPOINT"
sync_var "AWS_REGION" "$AWS_REGION"
sync_var "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
sync_var "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"
sync_var "AWS_BUCKET_NAME" "$AWS_BUCKET_NAME"

# Web Push (VAPID)
sync_var "VAPID_PUBLIC_KEY" "$VAPID_PUBLIC_KEY"
sync_var "VAPID_PRIVATE_KEY" "$VAPID_PRIVATE_KEY"
sync_var "VAPID_SUBJECT" "$VAPID_SUBJECT"

# Central Logging (Vector / Loki)
sync_var "LOGGING_URL" "$LOGGING_URL"
sync_var "LOGGING_USER" "$LOGGING_USER"
sync_var "LOGGING_PASSWORD" "$LOGGING_PASSWORD"


# Container Registry & Image Tags
sync_var "IMAGE_TAG" "$IMAGE_TAG"
sync_var "REGISTRY_IMAGE_PREFIX" "$REGISTRY_IMAGE_PREFIX"

# 3. Pull pre-built images or build locally
if [ "$USE_PREBUILT_IMAGES" = "true" ]; then
    if [ -n "$GHCR_TOKEN" ] && [ -n "$GHCR_USER" ]; then
        echo "🔑 Logging into GitHub Container Registry (ghcr.io)..."
        echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin || true
    fi

    echo "📦 Pulling verified pre-built images in parallel from GitHub Container Registry..."
    docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" pull
    
    echo "🚀 Starting updated production containers (Caddy SSL, Frontend, Backend, WS)..."
    docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" up -d --remove-orphans
else
    echo "🔨 Building and starting Docker containers on local host..."
    docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" up -d --build --remove-orphans
fi

# 4. Synchronize Prisma database schema to PostgreSQL
echo "🗄️ Synchronizing Prisma database schema to PostgreSQL..."
docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" exec -T backend npx prisma db push --schema=apps/backend/prisma/schema --accept-data-loss || docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" exec -T backend npx prisma db push --schema=prisma/schema --accept-data-loss || true

# 5. Clean up old dangling images while preserving layer cache
echo "🧹 Pruning old unused Docker images (older than 24h)..."
docker image prune -f --filter "until=24h" || true

echo "========================================="
echo "  AREENA [$PROJECT_NAME] Deployed Successfully!"
echo "========================================="
