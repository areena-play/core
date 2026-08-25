import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const PORT = parseInt(process.env.WS_PORT || '5000', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`[AREENA WebSocket Server] Initializing on port ${PORT}...`);

const wss = new WebSocketServer({ port: PORT });
const redisSub = new Redis(REDIS_URL, {
    retryStrategy(times) {
        return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
});

interface ClientSession {
    ws: WebSocket;
    isAlive: boolean;
    subscriptions: Set<string>;
}

const clients = new Map<WebSocket, ClientSession>();

// Setup Redis Pub/Sub subscriber
async function initRedisSubscriber() {
    try {
        await redisSub.connect();
        console.log('[AREENA WS] Connected to Redis successfully');

        await redisSub.subscribe('areena:scores', 'areena:encounters', 'areena:licenses', 'areena:announcements');

        redisSub.on('message', (redisChannel, message) => {
            // Broadcast to relevant connected clients
            try {
                const parsed = JSON.parse(message);
                const broadcastPayload = JSON.stringify({
                    channel: redisChannel,
                    data: parsed,
                    timestamp: new Date().toISOString(),
                });

                for (const [ws, session] of clients.entries()) {
                    if (ws.readyState === WebSocket.OPEN) {
                        // Send if subscribed or if general broadcast
                        ws.send(broadcastPayload);
                    }
                }
            } catch (err) {
                console.error('[AREENA WS] Error processing message from redis:', err);
            }
        });
    } catch (err: any) {
        console.warn('[AREENA WS] Redis subscriber connection failed (running in standalone mode):', err.message);
    }
}

initRedisSubscriber();

wss.on('connection', (ws: WebSocket) => {
    const session: ClientSession = {
        ws,
        isAlive: true,
        subscriptions: new Set(['general']),
    };

    clients.set(ws, session);

    ws.send(
        JSON.stringify({
            event: 'CONNECTED',
            message: 'Connected to AREENA Realtime Event Stream',
            timestamp: new Date().toISOString(),
        }),
    );

    ws.on('pong', () => {
        session.isAlive = true;
    });

    ws.on('message', (data: string) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.action === 'subscribe' && msg.channel) {
                session.subscriptions.add(msg.channel);
                ws.send(JSON.stringify({ event: 'SUBSCRIBED', channel: msg.channel }));
            } else if (msg.action === 'unsubscribe' && msg.channel) {
                session.subscriptions.delete(msg.channel);
                ws.send(JSON.stringify({ event: 'UNSUBSCRIBED', channel: msg.channel }));
            } else if (msg.action === 'ping') {
                ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
            }
        } catch {}
    });

    ws.on('close', () => {
        clients.delete(ws);
    });

    ws.on('error', () => {
        clients.delete(ws);
    });
});

// Heartbeat ping interval
const interval = setInterval(() => {
    for (const [ws, session] of clients.entries()) {
        if (!session.isAlive) {
            ws.terminate();
            clients.delete(ws);
            continue;
        }
        session.isAlive = false;
        ws.ping();
    }
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

console.log(`[AREENA WebSocket Server] Ready and listening on ws://localhost:${PORT}`);
