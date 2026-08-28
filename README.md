# AREENA — Multi-Sport Tournament & Association Management Platform

AREENA is a modern, high-performance tournament management and sports federation administration platform built for sports associations, regional leagues, clubs, licensed athletes, and live match scoring across multiple sporting disciplines.

---

## 🏛️ Monorepo Architecture

The repository is structured as an npm workspaces monorepo:

```
areena/
├── apps/
│   ├── backend/             # Express.js REST API & Prisma ORM
│   ├── frontend/            # Next.js 14 (App Router) + Tailwind CSS
│   └── websocket-server/    # Standalone WebSocket Server + Redis Pub/Sub
├── packages/
│   └── shared/              # Shared TypeScript types, interfaces & Zod validation schemas
├── scripts/
│   └── deploy.sh            # Production/Dev zero-downtime deployment script
├── .github/workflows/
│   ├── deploy-production.yml# Production CI/CD (GitHub runner parallel image builds + SSH deploy)
│   └── deploy-dev.yml       # Development CI/CD (Host build + SSH deploy)
├── Caddyfile                # Edge reverse proxy & automated Let's Encrypt SSL
├── docker-compose.yml       # Local development stack (Postgres, Redis, MinIO)
└── docker-compose.prod.yml  # Production deployment stack (Caddy SSL + Apps)
```

---

## 🚀 Technology Stack

- **Frontend**: Next.js 14 (App Router, Standalone output), React 18, Tailwind CSS, Lucide Icons
- **Backend API**: Node.js 22 LTS, Express.js, TypeScript 5.8
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Real-Time Engine**: WebSocket (`ws`), Redis 7 Pub/Sub
- **Storage**: AWS S3 / Cloudflare R2 / Local MinIO (S3-compatible)
- **Reverse Proxy & SSL**: Caddy 2 (Automated Let's Encrypt TLS on ports 80 & 443)
- **Authentication**: JWT user sessions, OAuth 2.0 (Client Credentials & Authorization Code)

---

## 🛠️ Local Development Quickstart

### 1. Prerequisites
- Node.js `>= 20.x` (Recommended: Node 22 LTS)
- Docker & Docker Compose
- npm `>= 10.x`

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Servers
```bash
npm run dev
```
> **Note**: Running `npm run dev` automatically starts the required local Docker services (**PostgreSQL**, **Redis**, and **MinIO S3**) in the background via npm's `predev` lifecycle hook!

This runs all services concurrently:
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **WebSocket Server**: `ws://localhost:5000`
- **MinIO Storage**: `http://localhost:9000` (Console: `http://localhost:9001`)

To stop the background Docker services when finished:
```bash
npm run dev:stop
```

---

## 🔒 Security & Access Control

The AREENA API is protected by a multi-tier ingress guard:

1. **OAuth 2.0 / API Key Clients (`Authorization: Bearer atk_...`)**:
   - High-throughput, unrestricted access with **no rate limits**.
2. **Frontend Web Page Users**:
   - Allowed access via browser fetch metadata (`Sec-Fetch-Site: same-origin`) or User Session JWTs.
   - Protected by an in-memory sliding-window token bucket rate limiter (120 req/min).
3. **Direct Unauthenticated API Calls (Scrapers / Bots)**:
   - Blocked with `401 Unauthorized`.
4. **Public Whitelist**:
   - `GET /health`, `POST /oauth/token`, and public media streaming (`GET /upload/file/*`).

---

## 📦 Production Deployment

### Automated CI/CD Workflows

1. **Production Deployment (`main` branch)**:
   - Triggered on push to `main`.
   - Builds all 3 Docker images in **parallel matrix jobs** on GitHub runners.
   - Pushes images to GitHub Container Registry (`ghcr.io`).
   - SSHs into the VPS, pulls pre-built images in ~2 seconds, applies Prisma migrations, and restarts containers.
2. **Development Deployment (`dev/main` branch)**:
   - Triggered on push to `dev/main`.
   - Runs directly on the **Dev VPS Self-Hosted Runner** (`runs-on: self-hosted`), building on the host machine with **0 billed GitHub minutes**.

### Required GitHub Secrets & Variables

Under **Settings > Secrets and variables > Actions**:

#### Variables (`vars.*`):
- `PROD_SSH_HOST`, `PROD_SSH_USER`
- `PROD_DOMAIN` (e.g. `demo.areena.ch`)
- `DEV_DOMAIN` (e.g. `dev.areena.ch`)
- `LETSENCRYPT_EMAIL` (e.g. `admin@areena.ch`)

#### Secrets (`secrets.*`):
- `PROD_SSH_KEY` (Ed25519 Private Key for Production SSH)
- `PROD_ENV` / `DEV_ENV` (Full `.env` contents with DB credentials, S3 keys, JWT secret)

---

## 📜 Build Verification

To verify full TypeScript compilation and Next.js static build across all workspaces:
```bash
npm run build
```