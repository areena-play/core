'use client';

import React from 'react';
import { useAuth } from '@/lib/authContext';

export function AuthEpochBoundary({ children }: { children: React.ReactNode }) {
    const { authEpoch } = useAuth();
    return <React.Fragment key={authEpoch}>{children}</React.Fragment>;
}

