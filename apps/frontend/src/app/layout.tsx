import './globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/authContext';
import { ThemeProvider } from '@/lib/themeContext';
import { I18nProvider } from '@/lib/i18nContext';
import { MainViewProvider } from '@/lib/mainViewContext';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { FullscreenViewLoader } from '@/components/layout/FullscreenViewLoader';
import { PageTitleManager } from '@/components/layout/PageTitleManager';
import { AdminNoticeModal } from '@/components/notices/AdminNoticeModal';
import { AdminNoticeBanner } from '@/components/notices/AdminNoticeBanner';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { TopLoadingBar } from '@/components/layout/TopLoadingBar';
import { DialogContainer } from '@/lib/dialog';
import { AreenaDevTools } from '@/components/layout/AreenaDevTools';

export const metadata: Metadata = {
    title: {
        template: 'AREENA – %s',
        default: 'AREENA',
    },
    description:
        'Next-generation web platform for national and regional sports federations, leagues, tournaments, and licenses.',
    icons: {
        icon: [
            { url: '/icon.svg', type: 'image/svg+xml' },
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: 'any' },
        ],
        shortcut: '/favicon.svg',
        apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 h-screen w-screen overflow-hidden flex flex-col antialiased selection:bg-red-600 selection:text-white transition-colors duration-200">
                <ThemeProvider>
                    <I18nProvider>
                        <AuthProvider>
                            <MainViewProvider>
                                <TopLoadingBar />
                                <AreenaDevTools />
                                <DialogContainer />
                                <PageTitleManager />
                                <FullscreenViewLoader />
                                <AdminNoticeModal />
                                <Navbar />
                                <AdminNoticeBanner />
                                <CookieConsentBanner />
                                <div className="flex flex-1 min-h-0 overflow-hidden">
                                    <Suspense fallback={<aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70 hidden md:flex" />}><Sidebar /></Suspense>
                                    <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                                        <div className="mx-auto max-w-7xl">{children}</div>
                                    </main>
                                </div>
                            </MainViewProvider>
                        </AuthProvider>
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
