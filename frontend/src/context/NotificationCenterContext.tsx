import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {NotificationController} from "../controller/NotificationController";
import {ReturnObject} from "../common/response/ReturnObject";
import {API_BASE_URL} from "../utils/api/api_config";

interface NotificationCenterContextValue {
    unreadCount: number;
    connected: boolean;
    lastMessageAt: number;
    refreshUnread: () => Promise<number>;
}

interface NotificationCenterProviderProps {
    username?: string | null;
    refreshTrigger?: string | number;
    children: React.ReactNode;
}

const defaultContextValue: NotificationCenterContextValue = {
    unreadCount: 0,
    connected: false,
    lastMessageAt: 0,
    refreshUnread: async () => 0
};

const NotificationCenterContext = createContext<NotificationCenterContextValue>(defaultContextValue);

const buildWsUrl = (): string => {
    const base = API_BASE_URL?.trim() || "/";
    if (base.startsWith("https://")) {
        return `${base.replace(/^https:\/\//, "wss://").replace(/\/$/, "")}/ws/notification`;
    }
    if (base.startsWith("http://")) {
        return `${base.replace(/^http:\/\//, "ws://").replace(/\/$/, "")}/ws/notification`;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/notification`;
};

export const NotificationCenterProvider: React.FC<NotificationCenterProviderProps> = ({
    username,
    refreshTrigger,
    children
}) => {
    const notificationController = useMemo(() => new NotificationController(), []);
    const [unreadCount, setUnreadCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const [lastMessageAt, setLastMessageAt] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);

    const clearReconnectTimer = () => {
        if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const closeSocket = () => {
        clearReconnectTimer();
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (_e) {
            }
            wsRef.current = null;
        }
    };

    const refreshUnread = useCallback(async (): Promise<number> => {
        if (!username || !username.trim()) {
            setUnreadCount(0);
            return 0;
        }
        try {
            const res = await notificationController.unreadCount(null);
            if (res.status === ReturnObject.Status.SUCCESS) {
                const count = Number(res.data?.count ?? 0);
                setUnreadCount(count);
                return count;
            }
        } catch (_e) {
        }
        return 0;
    }, [notificationController, username]);

    useEffect(() => {
        void refreshUnread();
    }, [refreshTrigger, refreshUnread]);

    useEffect(() => {
        closeSocket();
        setConnected(false);
        if (!username || !username.trim()) {
            setUnreadCount(0);
            return;
        }

        let closedByEffect = false;
        const wsUrl = buildWsUrl();
        const connect = () => {
            if (closedByEffect) {
                return;
            }
            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;

            socket.onopen = () => {
                setConnected(true);
                clearReconnectTimer();
            };

            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as {
                        event?: string;
                        unreadCount?: number;
                    };
                    if (typeof payload.unreadCount === "number") {
                        setUnreadCount(payload.unreadCount);
                    } else if (payload.event === "notification") {
                        void refreshUnread();
                    }
                } catch (_e) {
                    void refreshUnread();
                } finally {
                    setLastMessageAt(Date.now());
                }
            };

            socket.onclose = () => {
                setConnected(false);
                wsRef.current = null;
                if (!closedByEffect) {
                    reconnectTimerRef.current = window.setTimeout(connect, 3000);
                }
            };

            socket.onerror = () => {
                setConnected(false);
            };
        };

        connect();
        void refreshUnread();

        return () => {
            closedByEffect = true;
            closeSocket();
            setConnected(false);
        };
    }, [refreshUnread, username]);

    const value = useMemo<NotificationCenterContextValue>(() => ({
        unreadCount,
        connected,
        lastMessageAt,
        refreshUnread
    }), [connected, lastMessageAt, refreshUnread, unreadCount]);

    return (
        <NotificationCenterContext.Provider value={value}>
            {children}
        </NotificationCenterContext.Provider>
    );
};

export const useNotificationCenter = () => {
    return useContext(NotificationCenterContext);
};

