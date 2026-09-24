'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useWebSocket } from '@/lib/useWebSocket';
import { LiveTicker } from '@/components/layout/LiveTicker';
import { UserPersonalDashboard } from '@/components/home/UserPersonalDashboard';
import { GuestPortalDashboard } from '@/components/home/GuestPortalDashboard';
import {
    Building2,
    Mail,
    Phone,
    Globe,
    ExternalLink,
    Shield,
    HelpCircle,
    BookOpen,
} from 'lucide-react';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { associations, mainAssoc } = useMainView();

    const [clubs, setClubs] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [liveEncounters, setLiveEncounters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [clubsRes, compRes, liveRes] = await Promise.allSettled([
                api.getClubs(),
                api.getCompetitions(),
                api.getLiveEncounters(),
            ]);

            if (clubsRes.status === 'fulfilled') setClubs(clubsRes.value || []);
            if (compRes.status === 'fulfilled') setCompetitions(compRes.value || []);
            if (liveRes.status === 'fulfilled') setLiveEncounters(liveRes.value || []);
        } catch (err) {
            console.error('Failed to load home page data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Listen to real-time score updates from Redis pub/sub over WebSocket
    useWebSocket((event) => {
        if (event.channel === 'areena:scores' || event.channel === 'areena:encounters') {
            api.getLiveEncounters()
                .then((data) => setLiveEncounters(data || []))
                .catch(() => {});
        }
    });

    const nationalAssoc = useMemo(() => {
        return associations.find((a) => a.isTopLevel) || mainAssoc || associations[0];
    }, [associations, mainAssoc]);

    return (
        <div className="space-y-6 md:space-y-8 pb-12">
            {/* Conditional Dashboard: Personal for Logged-in Users, Guest Portal for Visitors */}
            {user ? (
                <UserPersonalDashboard />
            ) : (
                <GuestPortalDashboard
                    clubs={clubs}
                    competitions={competitions}
                    liveEncounters={liveEncounters}
                />
            )}

            {/* CLEAN COMPACT FOOTER / IMPRESSUM LINK */}
            <div className="max-w-6xl mx-auto pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                            {nationalAssoc?.name || 'Swiss Table Tennis'}
                        </span>
                        <span>•</span>
                        <span>AREENA Sports Platform</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <Link href="/guide" className="hover:text-red-600 dark:hover:text-red-400 font-semibold transition">
                            Getting Started Guide
                        </Link>
                        <Link href="/impressum" className="hover:text-red-600 dark:hover:text-red-400 font-semibold transition">
                            Impressum & Legal
                        </Link>
                        <Link href="/data-protection" className="hover:text-red-600 dark:hover:text-red-400 font-semibold transition">
                            Data Protection
                        </Link>
                        <Link href="/manual" className="hover:text-red-600 dark:hover:text-red-400 font-semibold transition">
                            User Manual
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
