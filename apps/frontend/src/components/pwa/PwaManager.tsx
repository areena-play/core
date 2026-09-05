'use client';

import React, { useState } from 'react';
import { usePwaInstall } from '@/lib/pwa/usePwaInstall';
import { useMainView } from '@/lib/mainViewContext';
import { Download, X, CheckCircle2, Smartphone } from 'lucide-react';
import { triggerHaptic } from '@/lib/pwa/useHaptics';

export function PwaManager() {
    const { isInstallable, isInstalled, installApp } = usePwaInstall();
    const { mainAssoc } = useMainView();
    const [dismissed, setDismissed] = useState(false);
    const [installing, setInstalling] = useState(false);

    if (isInstalled || !isInstallable || dismissed) {
        return null;
    }

    const appPrefix = (mainAssoc?.shortName || mainAssoc?.code || '').trim();
    const appDisplayName = appPrefix ? `${appPrefix} AREENA` : 'AREENA';

    const handleInstall = async () => {
        triggerHaptic('medium');
        setInstalling(true);
        try {
            await installApp();
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:right-6 md:left-auto z-40 max-w-sm animate-in slide-in-from-bottom duration-300">
            <div className="rounded-2xl border border-red-500/30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl shadow-red-950/20 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-500/30">
                        <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white">Install {appDisplayName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Offline mode, haptics & live alerts</div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleInstall}
                        disabled={installing}
                        className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span>Install</span>
                    </button>
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            setDismissed(true);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

