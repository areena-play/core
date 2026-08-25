FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/websocket-server/package*.json ./apps/websocket-server/

RUN npm install

COPY packages/shared/ ./packages/shared/
COPY apps/websocket-server/ ./apps/websocket-server/

RUN npm run build --workspace=@areena/shared
RUN npm run build --workspace=@areena/websocket-server

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/websocket-server/package*.json ./apps/websocket-server/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/websocket-server/dist ./apps/websocket-server/dist

EXPOSE 5000

CMD ["node", "apps/websocket-server/dist/server.js"]

