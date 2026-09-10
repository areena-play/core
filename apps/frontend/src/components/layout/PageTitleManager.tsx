'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMainView } from '@/lib/mainViewContext';
import { useI18n } from '@/lib/i18nContext';

export function PageTitleManager() {
    const pathname = usePathname();
    const { entityMeta, mainAssoc } = useMainView();
    const { t } = useI18n();

    useEffect(() => {
        const mainAssocShort = mainAssoc?.shortName || mainAssoc?.code || mainAssoc?.name;

        // 1. If association data is still loading, keep the clean initial title
        if (!mainAssocShort) {
            document.title = 'AREENA';
            return;
        }

        // 2. For dynamic routes, wait until entityMeta has resolved to prevent intermediate flashes
        const isDynamicEntityRoute =
            pathname.startsWith('/competition/') ||
            pathname.startsWith('/club/') ||
            (pathname.startsWith('/association/') &&
                pathname !== '/associations' &&
                pathname !== '/associations/settings' &&
                pathname !== '/associations/billing' &&
                pathname !== '/associations/audit-logs');

        if (isDynamicEntityRoute && !entityMeta?.title) {
            return; // Wait until entity metadata is loaded
        }

        let pageName = '';

        // 3. Dynamic entity context (Tournament, Club, or Sub-Association)
        if (entityMeta?.title) {
            if (pathname.includes('/encounter/')) {
                pageName = `Match Score Sheet – ${entityMeta.title}`;
            } else if (pathname.endsWith('/competitions')) {
                pageName = `Tournaments – ${entityMeta.title}`;
            } else {
                pageName = entityMeta.title;
            }
        } else {
            // 4. Static / general routes
            if (pathname === '/') {
                pageName = t('nav.dashboard', undefined, 'Overview');
            } else if (pathname === '/competitions') {
                pageName = t('nav.tournaments', undefined, 'Tournaments');
            } else if (pathname === '/associations') {
                pageName = t('nav.associations', undefined, 'Associations');
            } else if (pathname === '/associations/settings' || pathname === '/management/settings') {
                pageName = t('associations.settingsTitle', undefined, 'Association Settings');
            } else if (pathname === '/associations/billing' || pathname.endsWith('/billing')) {
                pageName = t('billing.title', undefined, 'Finances & Invoicing');
            } else if (pathname === '/associations/audit-logs' || pathname.endsWith('/audit-logs')) {
                pageName = t('audit.title', undefined, 'Audit & Activity Trail');
            } else if (pathname === '/licenses') {
                pageName = t('nav.licenses', undefined, 'Licenses');
            } else if (pathname === '/licenses/apply') {
                pageName = t('licenses.applyNew', undefined, 'Apply for License');
            } else if (pathname === '/licenses/approvals') {
                pageName = 'License Approvals';
            } else if (pathname === '/licenses/refresher-courses') {
                pageName = 'Refresher Courses';
            } else if (pathname === '/search') {
                pageName = 'Search';
            } else if (pathname === '/calendar') {
                pageName = t('nav.calendar', undefined, 'Calendar');
            } else if (pathname === '/communications') {
                pageName = t('nav.communications', undefined, 'Communications');
            } else if (pathname === '/impressum') {
                pageName = t('impressum.title', undefined, 'Impressum & Legal');
            } else if (pathname === '/data-protection') {
                pageName = t('nav.dataProtection', undefined, 'Data Protection & Privacy');
            } else if (pathname === '/profile') {
                pageName = 'Profile';
            } else if (pathname === '/auth/login') {
                pageName = 'Sign In';
            } else if (pathname === '/auth/register') {
                pageName = 'Create Account';
            } else if (pathname === '/developers') {
                pageName = 'Developer Portal';
            } else {
                const segment = pathname.split('/').filter(Boolean).pop();
                pageName = segment
                    ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
                    : 'Overview';
            }
        }

        const divider = '-';
        document.title = `AREENA ${divider} ${mainAssocShort} ${divider} ${pageName}`;
    }, [pathname, entityMeta, mainAssoc, t]);

    return null;
}

