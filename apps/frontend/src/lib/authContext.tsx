'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    licenseId?: string | null;
    eloPoints: number;
    rank?: number | null;
    isSuperAdmin: boolean;
    emailVerified?: boolean;
    birthDate?: string | null;
    gender?: string | null;
    avatarUrl?: string | null;
    associationRoles?: Array<{ associationId: string; role: string }>;
    clubRoles?: Array<{ clubId: string; role: string }>;
    licenses?: any[];
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    justLoggedOut: boolean;
    authEpoch: number;
    login: (token: string, user: User) => void;
    logout: (redirectTo?: string) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    loading: true,
    justLoggedOut: false,
    authEpoch: 0,
    login: () => {},
    logout: () => {},
    refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [justLoggedOut, setJustLoggedOut] = useState(false);
    const [authEpoch, setAuthEpoch] = useState(0);

    const refreshUser = async () => {
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        const storedToken = localStorage.getItem('areena_token');
        if (!storedToken) {
            setUser(null);
            setToken(null);
            setLoading(false);
            return;
        }

        setToken(storedToken);

        try {
            const userData = await api.getMe();
            if (userData && userData.id) {
                setUser(userData);
                localStorage.setItem('areena_user', JSON.stringify(userData));
            }
        } catch (err: any) {
            // Invalidate local session if token is rejected or user not found (401, 403, 404)
            if (err?.status === 401 || err?.status === 403 || err?.status === 404 || err?.error === 'Invalid or expired token') {
                console.warn('[Auth] Stored session is invalid, expired, or user deleted. Logging out.');
                localStorage.removeItem('areena_token');
                localStorage.removeItem('areena_user');
                setUser(null);
                setToken(null);
            } else {
                console.warn('[Auth] Unable to verify session with /auth/me; retaining cached session:', err?.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Immediately restore cached credentials on client mount to prevent logout flicker
        try {
            const storedToken = localStorage.getItem('areena_token');
            const storedUser = localStorage.getItem('areena_user');
            if (storedToken) {
                setToken(storedToken);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            }
        } catch {}

        refreshUser();
    }, []);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('areena_token', newToken);
        localStorage.setItem('areena_user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        setJustLoggedOut(false);
        setAuthEpoch((prev) => prev + 1);
        setLoading(false);
    };

    const logout = (redirectTo?: string) => {
        localStorage.removeItem('areena_token');
        localStorage.removeItem('areena_user');
        setToken(null);
        setUser(null);
        setAuthEpoch((prev) => prev + 1);

        if (redirectTo) {
            setJustLoggedOut(false);
            router.replace(redirectTo);
        } else {
            setJustLoggedOut(true);
            setTimeout(() => {
                setJustLoggedOut(false);
            }, 1000);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, justLoggedOut, authEpoch, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

