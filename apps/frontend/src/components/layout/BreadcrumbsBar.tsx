'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    ChevronRight,
    Home,
    Shield,
    Trophy,
    Building2,
    User,
    Layers,
    HelpCircle,
    Calculator,
    BookOpen,
    Activity,
    Code2,
    Megaphone,
    SlidersHorizontal,
    Table as TableIcon,
    Swords,
    Users,
    Settings,
    Key,
    FileSpreadsheet,
    FileText,
    BarChart3,
    DollarSign,
    Calendar,
    Award,
    Volume2,
} from 'lucide-react';
import { useMainView } from '@/lib/mainViewContext';
import { useI18n } from '@/lib/i18nContext';
import { findCategoryBySlug } from '@/lib/slug';

// Map of static pathname segments to clean human-readable names and icons
const SEGMENT_METADATA: Record<string, { labelKey?: string; fallback: string; icon?: any }> = {
    people: { fallback: 'People Directory', icon: User },
    clubs: { fallback: 'Clubs', icon: Shield },
    club: { fallback: 'Club', icon: Shield },
    competitions: { fallback: 'Competitions', icon: Trophy },
    competition: { fallback: 'Competition', icon: Trophy },
    calendar: { fallback: 'Calendar', icon: Calendar },
    courses: { fallback: 'Refresher Courses', icon: BookOpen },
    locations: { fallback: 'Locations & Venues' },
    associations: { fallback: 'Associations', icon: Building2 },
    association: { fallback: 'Association', icon: Building2 },
    utilities: { fallback: 'Utilities', icon: SlidersHorizontal },
    'elo-calculator': { fallback: 'ELO Calculator', icon: Calculator },
    'level-table': { fallback: 'Level & Skill Table', icon: TableIcon },
    developers: { fallback: 'Developer API', icon: Code2 },
    'developer-api': { fallback: 'Developer API', icon: Code2 },
    support: { fallback: 'Support & Help', icon: HelpCircle },
    manual: { fallback: 'User Manual', icon: BookOpen },
    'audit-trail': { fallback: 'Audit Trail', icon: Activity },
    'audit-logs': { fallback: 'Audit Logs', icon: Activity },
    notices: { fallback: 'System Notices', icon: Megaphone },
    profile: { fallback: 'My Profile', icon: User },
    management: { fallback: 'Management', icon: SlidersHorizontal },
    admin: { fallback: 'System Administration', icon: Settings },
    settings: { fallback: 'Settings', icon: Settings },
    users: { fallback: 'User Management', icon: Users },
    finances: { fallback: 'Finances & Invoices', icon: DollarSign },
    billing: { fallback: 'Billing & Invoices', icon: DollarSign },
    communications: { fallback: 'Communications', icon: Megaphone },
    communication: { fallback: 'Communications', icon: Megaphone },
    licenses: { fallback: 'Licensing', icon: Award },
    licensing: { fallback: 'Licensing', icon: Award },
    access: { fallback: 'Access Control', icon: Key },
    referees: { fallback: 'Referees', icon: Award },
    dashboard: { fallback: 'Dashboard', icon: Activity },
    draws: { fallback: 'Draws & Brackets', icon: Layers },
    draw: { fallback: 'Draw & Brackets', icon: Layers },
    matches: { fallback: 'Match Schedule', icon: Swords },
    registrations: { fallback: 'Registrations', icon: Users },
    categories: { fallback: 'Categories', icon: Layers },
    category: { fallback: 'Category', icon: Layers },
    standings: { fallback: 'Standings', icon: BarChart3 },
    ranking: { fallback: 'Final Ranking', icon: BarChart3 },
    tableau: { fallback: 'Tableau & Results', icon: TableIcon },
    overview: { fallback: 'Overview', icon: Activity },
    details: { fallback: 'Details', icon: FileText },
    speaker: { fallback: 'Speaker Hub', icon: Volume2 },
    cashier: { fallback: 'Cashier Hub', icon: DollarSign },
    actions: { fallback: 'Actions Hub', icon: SlidersHorizontal },
    statistics: { fallback: 'Statistics', icon: BarChart3 },
    results: { fallback: 'Results', icon: Trophy },
    players: { fallback: 'Players', icon: Users },
    teams: { fallback: 'Teams', icon: Users },
    members: { fallback: 'Members', icon: Users },
    'members-hub': { fallback: 'Members Hub', icon: Users },
    contacts: { fallback: 'Contacts', icon: User },
    events: { fallback: 'Events & Tournaments', icon: Calendar },
    tournaments: { fallback: 'Tournaments', icon: Trophy },
    'api-keys': { fallback: 'API Keys', icon: Key },
    clicktt: { fallback: 'Click-TT Import', icon: FileSpreadsheet },
    encounter: { fallback: 'Encounter', icon: Swords },
};

function formatSlug(slug: string): string {
    return decodeURIComponent(slug)
        .split(/[-_]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

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
                  a.id?.toLowerCase() === assocIdOrSlug.toLowerCase() ||
                  a.slug?.toLowerCase() === assocIdOrSlug.toLowerCase() ||
                  a.code?.toLowerCase() === assocIdOrSlug.toLowerCase()
          ) || entityMeta
        : null;

    let pathAccumulator = '';
    let i = 0;

    while (i < segments.length) {
        const seg = segments[i];

        // 1. Handle /association/[idOrSlug]
        if (seg === 'association' && i + 1 < segments.length) {
            const nextSeg = segments[i + 1];
            pathAccumulator += `/association/${nextSeg}`;
            const label = currentAssoc?.title || currentAssoc?.name || currentAssoc?.shortName || (entityMeta?.title ?? 'Association');
            crumbs.push({
                label,
                href: pathAccumulator,
                isCurrent: false,
                icon: Building2,
            });
            i += 2;
            continue;
        }

        // 2. Handle /club/[idOrSlug]
        if (seg === 'club' && i + 1 < segments.length) {
            const nextSeg = segments[i + 1];
            pathAccumulator += `/club/${nextSeg}`;
            const label = entityMeta?.title || formatSlug(nextSeg) || 'Club';
            crumbs.push({
                label,
                href: pathAccumulator,
                isCurrent: false,
                icon: Shield,
            });
            i += 2;
            continue;
        }

        // 3. Handle /competition/[idOrSlug] and nested /category/[catSlug] or /encounter/[id]
        if (seg === 'competition' && i + 1 < segments.length) {
            const compSlug = segments[i + 1];
            pathAccumulator += `/competition/${compSlug}`;
            const compLabel = entityMeta?.title || formatSlug(compSlug) || 'Competition';
            crumbs.push({
                label: compLabel,
                href: pathAccumulator,
                isCurrent: false,
                icon: Trophy,
            });
            i += 2;

            // Check if followed by /category/[catSlug]
            if (i < segments.length && segments[i] === 'category' && i + 1 < segments.length) {
                const catSlug = segments[i + 1];
                pathAccumulator += `/category/${catSlug}`;
                const foundCategory = findCategoryBySlug(entityMeta?.categories || [], catSlug);
                const catLabel = foundCategory?.name || formatSlug(catSlug) || 'Category';
                crumbs.push({
                    label: catLabel,
                    href: pathAccumulator,
                    isCurrent: false,
                    icon: Layers,
                });
                i += 2;
            } else if (i < segments.length && segments[i] === 'encounter' && i + 1 < segments.length) {
                const encId = segments[i + 1];
                pathAccumulator += `/encounter/${encId}`;
                crumbs.push({
                    label: 'Encounter',
                    href: pathAccumulator,
                    isCurrent: false,
                    icon: Swords,
                });
                i += 2;
            }
            continue;
        }

        // 4. Handle standalone /category/[catSlug] (if visited directly)
        if (seg === 'category' && i + 1 < segments.length) {
            const catSlug = segments[i + 1];
            pathAccumulator += `/category/${catSlug}`;
            const foundCategory = findCategoryBySlug(entityMeta?.categories || [], catSlug);
            const catLabel = foundCategory?.name || formatSlug(catSlug) || 'Category';
            crumbs.push({
                label: catLabel,
                href: pathAccumulator,
                isCurrent: false,
                icon: Layers,
            });
            i += 2;
            continue;
        }

        // 5. Handle /people/[identifier]
        if (seg === 'people' && i + 1 < segments.length) {
            pathAccumulator += `/${seg}/${segments[i + 1]}`;
            crumbs.push({
                label: 'People',
                href: pathAccumulator,
                isCurrent: false,
                icon: User,
            });
            i += 2;
            continue;
        }

        // 6. Standard segment resolution
        pathAccumulator += `/${seg}`;
        const meta = SEGMENT_METADATA[seg.toLowerCase()];
        let label = meta?.fallback;

        if (!label) {
            if (seg.length > 20) {
                label = 'Details';
            } else {
                label = formatSlug(seg);
            }
        }

        crumbs.push({
            label,
            href: pathAccumulator,
            isCurrent: false,
            icon: meta?.icon,
        });
        i += 1;
    }

    if (crumbs.length <= 1) return null;

    // Mark the final crumb as current and remove its link
    crumbs[crumbs.length - 1].isCurrent = true;
    crumbs[crumbs.length - 1].href = undefined;

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