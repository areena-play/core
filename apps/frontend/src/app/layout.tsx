import './globals.css';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
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
import { AdminNoticeProvider } from '@/lib/adminNoticeContext';
import { ToastContainer } from '@/lib/toast';
import { PopupContainer } from '@/lib/popup';
import { BreadcrumbsBar } from '@/components/layout/BreadcrumbsBar';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { GlobalMobileScorecardController } from '@/components/mobile/GlobalMobileScorecardController';
import { PwaManager } from '@/components/pwa/PwaManager';
import { getSiteBaseUrl } from '@/lib/siteUrl';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#090d16' },
    ],
};

export const metadata: Metadata = {
    metadataBase: new URL(getSiteBaseUrl()),
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'AREENA',
    },
    title: {
        template: 'AREENA – %s',
        default: 'AREENA – Sports Federation, Tournament & League Management',
    },
    description:
        'Next-generation web platform for national and regional sports federations, leagues, tournaments, and licenses.',
    keywords: [
        'sports federation',
        'badminton',
        'squash',
        'tennis',
        'tournaments',
        'leagues',
        'elo rating',
        'live scoring',
        'sports management',
        'switzerland',
    ],
    authors: [{ name: 'AREENA Team' }],
    creator: 'AREENA',
    publisher: 'AREENA Platform',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        title: 'AREENA – Sports Federation & Tournament Platform',
        description: 'Next-generation web platform for national and regional sports federations, leagues, tournaments, and licenses.',
        url: getSiteBaseUrl(),
        siteName: 'AREENA',
        locale: 'de_CH',
        alternateLocale: ['fr_CH', 'it_CH', 'en_US'],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AREENA – Sports Federation & Tournament Platform',
        description: 'Next-generation sports federation, league, and tournament management platform.',
    },
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
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var stored = localStorage.getItem('areena_theme');
                                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                    var isDark = stored === 'dark' || (!stored && prefersDark) || (stored === 'system' && prefersDark);
                                    if (isDark) {
                                        document.documentElement.classList.add('dark');
                                        document.documentElement.classList.remove('light');
                                        document.documentElement.style.colorScheme = 'dark';
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                        document.documentElement.classList.add('light');
                                        document.documentElement.style.colorScheme = 'light';
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 fixed inset-0 h-[100dvh] w-full overflow-hidden flex flex-col antialiased selection:bg-red-600 selection:text-white transition-colors duration-200">
                <ThemeProvider>
                    <I18nProvider>
                        <AuthProvider>
                            <MainViewProvider>
                                <AdminNoticeProvider>
                                    <TopLoadingBar />
                                    <AreenaDevTools />
                                    <ToastContainer />
                                    <PopupContainer />
                                    <DialogContainer />
                                    <PageTitleManager />
                                    <FullscreenViewLoader />
                                    <AdminNoticeModal />
                                    <Navbar />
                                    <AdminNoticeBanner />
                                    <CookieConsentBanner />
                                    <PwaManager />
                                    <GlobalMobileScorecardController />
                                    <div className="flex flex-1 min-h-0 overflow-hidden relative">
                                        <Suspense fallback={<aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70 hidden md:flex" />}><Sidebar /></Suspense>
                                        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 [scrollbar-gutter:stable] bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                                            <div className="mx-auto max-w-[1440px] space-y-4">
                                                <Suspense fallback={null}>
                                                    <BreadcrumbsBar />
                                                </Suspense>
                                                {children}
                                            </div>
                                        </main>
                                    </div>
                                    <MobileBottomNav />
                                </AdminNoticeProvider>
                            </MainViewProvider>
                        </AuthProvider>
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
