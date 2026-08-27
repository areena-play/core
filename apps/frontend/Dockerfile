FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm install

COPY packages/shared/ ./packages/shared/
COPY apps/frontend/ ./apps/frontend/

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:5000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build --workspace=@areena/shared
RUN npm run build --workspace=@areena/frontend

# Runner stage: Lightweight Standalone Next.js runner (no npm install required!)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
