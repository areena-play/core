'use client';

import React from 'react';
import { usePushNotifications } from '@/lib/pwa/usePushNotifications';
import {
    Bell,
    BellOff,
    BellRing,
    CheckCircle2,
    AlertCircle,
    Send,
    Loader2,
} from 'lucide-react';

export function PushNotificationCard({ compact = false }: { compact?: boolean }) {
    const {
        isSupported,
        permission,
        isSubscribed,
        loading,
        error,
        subscribe,
        unsubscribe,
        sendTestNotification,
    } = usePushNotifications();

    if (!isSupported) {
        return (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Push notifications are not supported on this browser or platform.
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl ${isSubscribed ? 'bg-red-500/10 text-red-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>
                        {isSubscribed ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Live Push Alerts</div>
                        <div className="text-[11px] text-slate-500">{isSubscribed ? 'Active for Table Calls' : 'Disabled'}</div>
                    </div>
                </div>

                <button
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={loading}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center space-x-1 ${
                        isSubscribed
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/30'
                    }`}
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSubscribed ? 'Disable' : 'Enable'}
                </button>
            </div>
        );
    }

    return (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-2xl ${isSubscribed ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {isSubscribed ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>Live Match & Tournament Push Alerts</span>
                            {isSubscribed && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Active
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Get instant table calls, score verifications, and schedule changes right on your device.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {permission === 'denied' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
                    Notifications are blocked in your browser settings. Please enable them in your device permissions.
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {isSubscribed ? (
                    <>
                        <button
                            onClick={sendTestNotification}
                            disabled={loading}
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-red-600" />}
                            <span>Send Test Alert</span>
                        </button>
                        <button
                            onClick={unsubscribe}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium transition"
                        >
                            Disable Alerts
                        </button>
                    </>
                ) : (
                    <button
                        onClick={subscribe}
                        disabled={loading}
                        className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 transition active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                        <span>Enable Push Notifications</span>
                    </button>
                )}
            </div>
        </div>
    );
}
