'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface WebSocketEventPayload {
    channel: string;
    data: any;
    timestamp: string;
}

function getWebSocketUrl(): string {
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;

    // Server-side rendering fallback
    if (typeof window === 'undefined') {
        return envUrl || 'ws://localhost:5000';
    }

    // If an explicit remote WebSocket URL is set and doesn't point to localhost
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
    }

    // If running in local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'ws://localhost:5000';
    }

    // In production / remote environments behind SSL reverse proxy (Caddy / Nginx)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket(onEvent?: (event: WebSocketEventPayload) => void) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketEventPayload | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    const connect = useCallback(() => {
        try {
            const wsUrl = getWebSocketUrl();
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                // Subscribe to all channels
                ws.send(JSON.stringify({ action: 'subscribe', channel: 'scores' }));
                ws.send(JSON.stringify({ action: 'subscribe', channel: 'encounters' }));
                ws.send(JSON.stringify({ action: 'subscribe', channel: 'licenses' }));
                ws.send(JSON.stringify({ action: 'subscribe', channel: 'announcements' }));
            };

            ws.onmessage = (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload.channel) {
                        setLastMessage(payload);
                        if (onEventRef.current) {
                            onEventRef.current(payload);
                        }
                    }
                } catch {}
            };

            ws.onclose = () => {
                setIsConnected(false);
                // Reconnect after 3 seconds
                setTimeout(connect, 3000);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            setIsConnected(false);
            setTimeout(connect, 4000);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { isConnected, lastMessage };
}
