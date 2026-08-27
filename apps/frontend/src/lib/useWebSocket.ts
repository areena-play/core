'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

export interface WebSocketEventPayload {
    channel: string;
    data: any;
    timestamp: string;
}

export function useWebSocket(onEvent?: (event: WebSocketEventPayload) => void) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketEventPayload | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(WS_URL);
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

    const send = useCallback((data: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    return { isConnected, lastMessage, send };
}
