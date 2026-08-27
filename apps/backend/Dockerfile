FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

RUN npm install

COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

RUN npm run build --workspace=@areena/shared
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma
RUN npm run build --workspace=@areena/backend

# Runner stage: Fast startup on Node 22 LTS
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/src ./apps/backend/src
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

COPY apps/backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
