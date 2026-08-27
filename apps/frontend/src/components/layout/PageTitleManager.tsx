'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useMainView } from '@/lib/mainViewContext';
import { useI18n } from '@/lib/i18nContext';

export function PageTitleManager() {
    const pathname = usePathname();
    const { entityMeta } = useMainView();
    const { t } = useI18n();
    const [mainAssocShort, setMainAssocShort] = useState<string>('STTV');

    // Fetch main association short name / abbreviation
    useEffect(() => {
        let isMounted = true;
        async function fetchMainAssoc() {
            try {
                const data = await api.getAssociations();
                const top =
                    data.associations?.find((a: any) => a.isTopLevel) || data.associations?.[0];
                if (top && isMounted) {
                    setMainAssocShort(top.shortName || top.code || top.name || 'STTV');
                }
            } catch {}
        }
        fetchMainAssoc();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let pageName = '';

        // Dynamic entity context (e.g. specific Tournament, Club, or Sub-Association)
        if (entityMeta?.title) {
            if (pathname.includes('/encounter/')) {
                pageName = `Match Score Sheet – ${entityMeta.title}`;
            } else if (pathname.endsWith('/tournaments')) {
                pageName = `Tournaments – ${entityMeta.title}`;
            } else {
                pageName = entityMeta.title;
            }
        } else {
            // Static / general routes
            if (pathname === '/') {
                pageName = t('nav.dashboard', undefined, 'Overview');
            } else if (pathname === '/tournaments') {
                pageName = t('nav.tournaments', undefined, 'Tournaments');
            } else if (pathname === '/competitions') {
                pageName = t('nav.competitions', undefined, 'Competitions & Leagues');
            } else if (pathname === '/associations') {
                pageName = t('nav.associations', undefined, 'Associations');
            } else if (pathname === '/associations/settings') {
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
            } else if (pathname === '/calendar') {
                pageName = t('nav.calendar', undefined, 'Calendar');
            } else if (pathname === '/communications') {
                pageName = t('nav.communications', undefined, 'Communications');
            } else if (pathname === '/impressum') {
                pageName = t('impressum.title', undefined, 'Impressum & Legal');
            } else if (pathname === '/profile') {
                pageName = 'Profile';
            } else if (pathname === '/auth/login') {
                pageName = 'Sign In';
            } else if (pathname === '/auth/register') {
                pageName = 'Create Account';
            } else if (pathname === '/developers') {
                pageName = 'Developer Portal';
            } else if (pathname.startsWith('/tournament/')) {
                pageName = 'Tournament';
            } else if (pathname.startsWith('/club/')) {
                pageName = 'Club';
            } else if (pathname.startsWith('/association/')) {
                pageName = 'Association';
            } else {
                const segment = pathname.split('/').filter(Boolean).pop();
                pageName = segment
                    ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
                    : 'Overview';
            }
        }

        const divider = '–';
        document.title = `AREENA ${divider} ${mainAssocShort} ${divider} ${pageName}`;
    }, [pathname, entityMeta, mainAssocShort, t]);

    return null;
}

