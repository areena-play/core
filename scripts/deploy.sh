#!/usr/bin/env bash
set -e

BRANCH="${1:-main}"
PROJECT_NAME="${2:-areena-$BRANCH}"

echo "========================================="
echo "  Starting AREENA Deployment"
echo "  Branch:       $BRANCH"
echo "  Project Name: $PROJECT_NAME"
echo "  Prebuilt:     ${USE_PREBUILT_IMAGES:-false}"
echo "  Domain:       ${DOMAIN_NAME:-localhost}"
echo "  Timestamp:    $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================="

# 1. Sync git branch
echo "📥 Fetching and syncing git branch (origin/$BRANCH)..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# 2. Write environment variables if passed from GitHub Secrets
if [ -n "$APP_ENV_CONTENT" ]; then
    echo "🔐 Writing .env configuration from GitHub Secrets..."
    echo "$APP_ENV_CONTENT" > .env
fi

# Ensure domain and email are registered in .env for Caddy
if [ -n "$DOMAIN_NAME" ]; then
    if grep -q "^DOMAIN_NAME=" .env 2>/dev/null; then
        sed -i "s|^DOMAIN_NAME=.*|DOMAIN_NAME=$DOMAIN_NAME|" .env
    else
        echo "DOMAIN_NAME=$DOMAIN_NAME" >> .env
    fi
fi

if [ -n "$LETSENCRYPT_EMAIL" ]; then
    if grep -q "^LETSENCRYPT_EMAIL=" .env 2>/dev/null; then
        sed -i "s|^LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL|" .env
    else
        echo "LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL" >> .env
    fi
fi

# 3. Pull pre-built images or build locally
if [ "$USE_PREBUILT_IMAGES" = "true" ]; then
    if [ -n "$GHCR_TOKEN" ] && [ -n "$GHCR_USER" ]; then
        echo "🔑 Logging into GitHub Container Registry (ghcr.io)..."
        echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin || true
    fi

    echo "📦 Pulling verified pre-built images from GitHub Container Registry..."
    docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" pull
    
    echo "🚀 Starting updated production containers (Caddy SSL, Frontend, Backend, WS)..."
    docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" up -d --remove-orphans
else
    echo "🔨 Building and starting Docker containers on local host..."
    docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" up -d --build --remove-orphans
fi

# 4. Apply Prisma database schema migrations to external database
echo "🗄️ Applying Prisma database migrations to external PostgreSQL..."
docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" exec -T backend npx prisma migrate deploy || true
docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" exec -T backend npx prisma generate --schema=prisma/schema.prisma || true

# 5. Clean up dangling images to keep server disk healthy
echo "🧹 Pruning unused Docker build cache..."
docker image prune -f

echo "========================================="
echo "  AREENA [$PROJECT_NAME] Deployed Successfully!"
echo "========================================="
