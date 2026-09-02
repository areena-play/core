'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { AdminNoticeDto, NoticeDisplayMode } from '@areena/shared';

const LOCAL_PERMANENT_DISMISSED_KEY = 'areena_dismissed_notices';
const SESSION_CLOSED_KEY = 'areena_session_closed_notices';

function getLocalPermanentDismissed(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_PERMANENT_DISMISSED_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addLocalPermanentDismissed(id: string) {
    if (typeof window === 'undefined') return;
    try {
        const existing = getLocalPermanentDismissed();
        if (!existing.includes(id)) {
            existing.push(id);
            localStorage.setItem(LOCAL_PERMANENT_DISMISSED_KEY, JSON.stringify(existing));
        }
    } catch {}
}

function getSessionClosed(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = sessionStorage.getItem(SESSION_CLOSED_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addSessionClosed(id: string) {
    if (typeof window === 'undefined') return;
    try {
        const existing = getSessionClosed();
        if (!existing.includes(id)) {
            existing.push(id);
            sessionStorage.setItem(SESSION_CLOSED_KEY, JSON.stringify(existing));
        }
    } catch {}
}

interface AdminNoticeContextType {
    rawNotices: AdminNoticeDto[];
    bannerNotices: AdminNoticeDto[];
    modalNotices: AdminNoticeDto[];
    loading: boolean;
    refreshNotices: () => Promise<void>;
    closeForSession: (id: string) => void;
    dismissPermanently: (id: string) => Promise<void>;
}

const AdminNoticeContext = createContext<AdminNoticeContextType>({
    rawNotices: [],
    bannerNotices: [],
    modalNotices: [],
    loading: true,
    refreshNotices: async () => {},
    closeForSession: () => {},
    dismissPermanently: async () => {},
});

export function AdminNoticeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [rawNotices, setRawNotices] = useState<AdminNoticeDto[]>([]);
    const [bannerNotices, setBannerNotices] = useState<AdminNoticeDto[]>([]);
    const [modalNotices, setModalNotices] = useState<AdminNoticeDto[]>([]);
    const [loading, setLoading] = useState(true);

    const filterNotices = useCallback((allNotices: AdminNoticeDto[]) => {
        const permDismissed = getLocalPermanentDismissed();
        const sessionClosed = getSessionClosed();

        // 1. Filter Banners
        const banners = allNotices
            .filter((n) => n.displayMode === NoticeDisplayMode.BANNER || !n.displayMode)
            .filter((n) => {
                if (n.isDismissible && permDismissed.includes(n.id)) return false;
                if (sessionClosed.includes(n.id)) return false;
                return true;
            });

        // 2. Filter Modals
        const modals = allNotices
            .filter((n) => n.displayMode === NoticeDisplayMode.MODAL)
            .filter((n) => {
                if (n.isDismissible && permDismissed.includes(n.id)) return false;
                if (sessionClosed.includes(n.id)) return false;
                return true;
            });

        setBannerNotices(banners);
        setModalNotices(modals);
    }, []);

    const fetchNotices = useCallback(async () => {
        try {
            setLoading(true);
            const data: AdminNoticeDto[] = await api.getActiveNotices();
            setRawNotices(data || []);
            filterNotices(data || []);
        } catch (err) {
            // Silently ignore active notice load error
        } finally {
            setLoading(false);
        }
    }, [filterNotices]);

    // Fetch once when the user's ID changes (or on initial mount)
    useEffect(() => {
        fetchNotices();
    }, [user?.id, fetchNotices]);

    const closeForSession = (id: string) => {
        addSessionClosed(id);
        setBannerNotices((prev) => prev.filter((n) => n.id !== id));
        setModalNotices((prev) => prev.filter((n) => n.id !== id));
    };

    const dismissPermanently = async (id: string) => {
        addLocalPermanentDismissed(id);
        setBannerNotices((prev) => prev.filter((n) => n.id !== id));
        setModalNotices((prev) => prev.filter((n) => n.id !== id));

        if (user) {
            try {
                await api.dismissNotice(id);
            } catch (err) {
                console.warn('Server notice dismissal sync error:', err);
            }
        }
    };

    return (
        <AdminNoticeContext.Provider
            value={{
                rawNotices,
                bannerNotices,
                modalNotices,
                loading,
                refreshNotices: fetchNotices,
                closeForSession,
                dismissPermanently,
            }}
        >
            {children}
        </AdminNoticeContext.Provider>
    );
}

export function useAdminNotices() {
    return useContext(AdminNoticeContext);
}

