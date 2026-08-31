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

# Ensure .env file exists
touch .env

# Helper to sync GitHub variables and secrets into .env
sync_var() {
    local var_name="$1"
    local var_value="$2"
    if [ -n "$var_value" ]; then
        if grep -q "^${var_name}=" .env 2>/dev/null; then
            sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" .env
        else
            echo "${var_name}=${var_value}" >> .env
        fi
    fi
}

# Sync domain, SSL and server identification
sync_var "DOMAIN_NAME" "$DOMAIN_NAME"
sync_var "LETSENCRYPT_EMAIL" "$LETSENCRYPT_EMAIL"
sync_var "SERVER_NAME" "$SERVER_NAME"

# Sync Central Logging configuration
sync_var "LOGGING_URL" "$LOGGING_URL"
sync_var "LOGGING_USER" "$LOGGING_USER"
sync_var "LOGGING_PASSWORD" "$LOGGING_PASSWORD"

# Sync Mailgun API configuration
sync_var "MAILGUN_API_KEY" "$MAILGUN_API_KEY"
sync_var "MAILGUN_DOMAIN" "$MAILGUN_DOMAIN"
sync_var "MAILGUN_EU" "$MAILGUN_EU"
sync_var "MAILGUN_HOST" "$MAILGUN_HOST"
sync_var "EMAIL_FROM_DEFAULT" "$EMAIL_FROM_DEFAULT"

# Sync SMTP fallback configuration
sync_var "SMTP_HOST" "$SMTP_HOST"
sync_var "SMTP_PORT" "$SMTP_PORT"
sync_var "SMTP_USER" "$SMTP_USER"
sync_var "SMTP_PASS" "$SMTP_PASS"
sync_var "SMTP_SECURE" "$SMTP_SECURE"

# Sync Support & Governance
sync_var "AREENA_SUPPORT_EMAIL" "$AREENA_SUPPORT_EMAIL"

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

# 4. Synchronize Prisma database schema to external PostgreSQL
echo "🗄️ Synchronizing Prisma database schema to external PostgreSQL..."
docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" exec -T backend npx prisma db push --schema=apps/backend/prisma/schema --accept-data-loss || docker compose -f docker-compose.prod.yml -p "$PROJECT_NAME" exec -T backend npx prisma db push --schema=prisma/schema --accept-data-loss || true

# 5. Clean up dangling images to keep server disk healthy
echo "🧹 Pruning unused Docker build cache..."
docker image prune -f

echo "========================================="
echo "  AREENA [$PROJECT_NAME] Deployed Successfully!"
echo "========================================="
