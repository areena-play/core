import './globals.css';
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
            { url: '/favicon.ico', sizes: '32x32' },
            { url: '/icon.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [{ url: '/icon.png', sizes: '180x180', type: 'image/png' }],
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
                                <PageTitleManager />
                                <FullscreenViewLoader />
                                <AdminNoticeModal />
                                <Navbar />
                                <AdminNoticeBanner />
                                <div className="flex flex-1 min-h-0 overflow-hidden">
                                    <Sidebar />
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
