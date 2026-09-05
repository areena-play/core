# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/frontend/package*.json ./apps/frontend/

RUN --mount=type=cache,target=/root/.npm npm install

COPY packages/shared/ ./packages/shared/
COPY apps/frontend/ ./apps/frontend/

ARG NEXT_PUBLIC_WS_PORT
ARG NEXT_PUBLIC_IS_DEMO=false
ARG NEXT_PUBLIC_APP_BASE_URL

ENV NEXT_PUBLIC_WS_PORT=$NEXT_PUBLIC_WS_PORT
ENV NEXT_PUBLIC_IS_DEMO=$NEXT_PUBLIC_IS_DEMO
ENV NEXT_PUBLIC_APP_BASE_URL=$NEXT_PUBLIC_APP_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@areena/shared
RUN npm run build --workspace=@areena/frontend

# Runner stage: Lightweight Standalone Next.js runner (Node 22 Alpine LTS)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
