'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, Home, Shield, Trophy, Building2, User, Layers, HelpCircle, Calculator, BookOpen, Activity, Code2, Megaphone } from 'lucide-react';
import { useMainView } from '@/lib/mainViewContext';
import { useI18n } from '@/lib/i18nContext';

// Map of static pathname segments to clean human-readable names and icons
const SEGMENT_METADATA: Record<string, { labelKey?: string; fallback: string; icon?: any }> = {
    people: { fallback: 'People Directory', icon: User },
    clubs: { fallback: 'Clubs', icon: Shield },
    club: { fallback: 'Club', icon: Shield },
    competitions: { fallback: 'Competitions', icon: Trophy },
    competition: { fallback: 'Competition', icon: Trophy },
    calendar: { fallback: 'Calendar', icon: Activity },
    courses: { fallback: 'Refresher Courses' },
    locations: { fallback: 'Locations & Venues' },
    associations: { fallback: 'Associations', icon: Building2 },
    association: { fallback: 'Association', icon: Building2 },
    utilities: { fallback: 'Utilities' },
    'elo-calculator': { fallback: 'ELO Calculator', icon: Calculator },
    'level-table': { fallback: 'Level & Skill Table' },
    developers: { fallback: 'Developer API', icon: Code2 },
    'developer-api': { fallback: 'Developer API', icon: Code2 },
    support: { fallback: 'Support & Help', icon: HelpCircle },
    manual: { fallback: 'User Manual', icon: BookOpen },
    'audit-trail': { fallback: 'Audit Trail', icon: Activity },
    notices: { fallback: 'System Notices', icon: Megaphone },
    profile: { fallback: 'My Profile', icon: User },
    management: { fallback: 'Management' },
    admin: { fallback: 'System Administration' },
    settings: { fallback: 'Settings' },
    users: { fallback: 'User Management' },
    finances: { fallback: 'Finances & Invoices' },
    communications: { fallback: 'Communications' },
    licenses: { fallback: 'Licensing' },
    access: { fallback: 'Access Control' },
    referees: { fallback: 'Referees' },
    dashboard: { fallback: 'Dashboard' },
    draws: { fallback: 'Draws & Brackets' },
    matches: { fallback: 'Match Schedule' },
    registrations: { fallback: 'Registrations' },
    categories: { fallback: 'Categories' },
    standings: { fallback: 'Standings' },
};

export function BreadcrumbsBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const { mainAssoc, entityMeta, associations } = useMainView();

    // Do not show breadcrumbs on homepage, authentication pages, or root welcome
    if (!pathname || pathname === '/' || pathname.startsWith('/auth/')) {
        return null;
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    interface Crumb {
        label: string;
        href?: string;
        isCurrent: boolean;
        icon?: any;
    }

    const crumbs: Crumb[] = [];

    // Root breadcrumb
    crumbs.push({
        label: mainAssoc?.shortName || mainAssoc?.name || 'Home',
        href: '/',
        isCurrent: false,
        icon: Home,
    });

    // Check if within a Sub-Association hierarchy
    const isAssocRoute = segments[0] === 'association' && segments.length >= 2;
    const assocIdOrSlug = isAssocRoute ? segments[1] : null;
    const currentAssoc = assocIdOrSlug
        ? associations?.find(
              (a: any) =>
                  a.id === assocIdOrSlug ||
                  a.slug === assocIdOrSlug ||
                  a.code?.toLowerCase() === assocIdOrSlug.toLowerCase()
          ) || entityMeta
        : null;

    let pathAccumulator = '';
    let skipNext = false;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        pathAccumulator += `/${seg}`;

        if (skipNext) {
            skipNext = false;
            continue;
        }

        // Handle /association/[id]
        if (seg === 'association' && i + 1 < segments.length) {
            const nextSeg = segments[i + 1];
            pathAccumulator += `/${nextSeg}`;
            skipNext = true;

            const isLast = i + 1 === segments.length - 1 && !searchParams.toString();
            crumbs.push({
                label: currentAssoc?.title || currentAssoc?.name || currentAssoc?.shortName || 'Association',
                href: isLast ? undefined : pathAccumulator,
                isCurrent: isLast,
                icon: Building2,
            });
            continue;
        }

        // Handle /competition/[id] or /club/[id]
        if ((seg === 'competition' || seg === 'club') && i + 1 < segments.length) {
            const nextSeg = segments[i + 1];
            pathAccumulator += `/${nextSeg}`;
            skipNext = true;

            const isLast = i + 1 === segments.length - 1 && !searchParams.toString();
            const resolvedTitle = entityMeta?.id === nextSeg ? entityMeta.title : (seg === 'club' ? 'Club' : 'Competition');
            crumbs.push({
                label: resolvedTitle,
                href: isLast ? undefined : pathAccumulator,
                isCurrent: isLast,
                icon: seg === 'club' ? Shield : Trophy,
            });
            continue;
        }

        // Handle /people/[identifier]
        if (seg === 'people' && i + 1 < segments.length) {
            const isLast = i === segments.length - 1;
            crumbs.push({
                label: 'People',
                href: isLast ? undefined : '/people',
                isCurrent: isLast,
                icon: User,
            });
            continue;
        }

        // Standard segment name resolution
        const isLast = i === segments.length - 1;
        const meta = SEGMENT_METADATA[seg.toLowerCase()];
        let label = meta?.fallback || seg;

        // Clean up formatted UUIDs or codes
        if (!meta && seg.length > 20) {
            label = 'Details';
        } else if (!meta) {
            // Capitalize generic slug (e.g. "elo-calculator" -> "Elo Calculator")
            label = seg
                .split(/[-_]/)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }

        crumbs.push({
            label,
            href: isLast ? undefined : pathAccumulator,
            isCurrent: isLast,
            icon: meta?.icon,
        });
    }

    if (crumbs.length <= 1) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400 py-1 px-0.5"
        >
            {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1;
                const Icon = crumb.icon;

                return (
                    <React.Fragment key={`${crumb.label}-${idx}`}>
                        {idx > 0 && (
                            <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}

                        {crumb.href && !isLast ? (
                            <Link
                                href={crumb.href}
                                className="inline-flex items-center gap-1 hover:text-red-600 dark:hover:text-red-400 transition font-medium max-w-[200px] truncate"
                            >
                                {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                                <span className="truncate">{crumb.label}</span>
                            </Link>
                        ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white max-w-[260px] truncate">
                                {Icon && <Icon className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                                <span className="truncate">{crumb.label}</span>
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}