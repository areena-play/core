'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    Trophy,
    Award,
    Network,
    Mail,
    Code2,
    Sliders,
    CheckSquare,
    GraduationCap,
    Shield,
    Layers,
    Users,
    Flame,
    ArrowLeft,
    Sparkles,
    Receipt,
    Activity,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useAuth } from '@/lib/authContext';

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useI18n();
    const { user } = useAuth();
    const { activeView, entityId, entityMeta, currentViewMeta } = useMainView();

    const ActiveIcon = currentViewMeta.icon;

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const isApprover =
        isAssocAdmin ||
        user?.clubRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    // Build navigation items tailored for the active entity workspace
    const getNavSections = () => {
        if (activeView === 'tournament' && entityId) {
            return [
                {
                    sectionTitle: 'Tournament Hub',
                    items: [
                        {
                            label: t('tournamentWorkspace.overview'),
                            href: `/tournament/${entityId}`,
                            icon: Trophy,
                        },
                        {
                            label: t('tournamentWorkspace.categories'),
                            href: `/tournament/${entityId}#categories`,
                            icon: Layers,
                        },
                        {
                            label: t('tournamentWorkspace.teams'),
                            href: `/tournament/${entityId}#teams`,
                            icon: Users,
                        },
                    ],
                },
                {
                    sectionTitle: 'Match Center & Scoring',
                    items: [
                        {
                            label: t('tournamentWorkspace.encounters'),
                            href: `/tournament/${entityId}#encounters`,
                            icon: Calendar,
                        },
                        {
                            label: t('tournamentWorkspace.courts'),
                            href: `/tournament/${entityId}#encounters`,
                            icon: Flame,
                            badge: 'LIVE',
                        },
                        {
                            label: t('tournamentWorkspace.standings'),
                            href: `/tournament/${entityId}#standings`,
                            icon: Trophy,
                        },
                    ],
                },
                {
                    sectionTitle: 'Navigation',
                    items: [
                        {
                            label: t('nav.backToTournaments'),
                            href: '/tournaments',
                            icon: ArrowLeft,
                        },
                    ],
                },
            ];
        }

        if (activeView === 'club' && entityId) {
            return [
                {
                    sectionTitle: 'Club Management',
                    items: [
                        {
                            label: t('clubWorkspace.overview'),
                            href: `/club/${entityId}`,
                            icon: Shield,
                        },
                        {
                            label: t('clubWorkspace.members'),
                            href: `/club/${entityId}#members`,
                            icon: Users,
                        },
                        {
                            label: t('clubWorkspace.teams'),
                            href: `/club/${entityId}#teams`,
                            icon: Trophy,
                        },
                    ],
                },
                {
                    sectionTitle: 'Club Activities',
                    items: [
                        {
                            label: t('clubWorkspace.calendar'),
                            href: `/calendar?clubId=${entityId}`,
                            icon: Calendar,
                        },
                        {
                            label: t('clubWorkspace.communications'),
                            href: `/communications?clubId=${entityId}`,
                            icon: Mail,
                        },
                    ],
                },
                {
                    sectionTitle: 'Navigation',
                    items: [
                        {
                            label: t('nav.backToAssociation'),
                            href: '/associations',
                            icon: ArrowLeft,
                        },
                    ],
                },
            ];
        }

        // Default: Association Workspace
        const isSubAssoc = pathname.startsWith('/association/') && entityId && entityId !== 'main';
        const assocOverviewHref = isSubAssoc ? `/association/${entityId}` : '/';
        const tournamentsHref = isSubAssoc ? `/association/${entityId}/tournaments` : '/tournaments';

        return [
            {
                sectionTitle: 'Federation Governance',
                items: [
                    { label: t('nav.dashboard'), href: assocOverviewHref, icon: LayoutDashboard },
                    { label: t('nav.tournaments'), href: tournamentsHref, icon: Trophy },
                    { label: t('nav.associations'), href: '/associations', icon: Network },
                    ...(isAssocAdmin
                        ? [
                              { label: t('nav.finances'), href: isSubAssoc ? `/association/${entityId}/billing` : '/associations/billing', icon: Receipt },
                              { label: t('nav.auditLogs'), href: isSubAssoc ? `/association/${entityId}/audit-logs` : '/associations/audit-logs', icon: Activity },
                              { label: t('nav.associationSettings'), href: '/associations/settings', icon: Sliders },
                          ]
                        : []),
                    { label: t('nav.calendar'), href: '/calendar', icon: Calendar },
                ],
            },
            {
                sectionTitle: 'Licensing & Education',
                items: [
                    { label: t('nav.licenses'), href: '/licenses', icon: Award },
                    ...(isApprover
                        ? [{ label: t('nav.approvals'), href: '/licenses/approvals', icon: CheckSquare }]
                        : []),
                    { label: t('nav.refresherCourses'), href: '/licenses/refresher-courses', icon: GraduationCap },
                ],
            },
            {
                sectionTitle: 'Operations & API',
                items: [
                    { label: t('nav.communications'), href: '/communications', icon: Mail },
                    { label: t('nav.developerApi'), href: '/developers', icon: Code2 },
                ],
            },
        ];
    };

    const sections = getNavSections();

    // Determine header card contents
    const headerTitle =
        entityMeta?.title ||
        (activeView === 'association' ? 'Swiss Table Tennis Federation' : t(currentViewMeta.labelKey));
    const headerBadge = entityMeta?.badge || t(currentViewMeta.badgeKey);
    const headerDesc = entityMeta?.subtitle || t(currentViewMeta.descKey);

    return (
        <aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70 hidden md:flex md:flex-col justify-between transition-colors duration-200">
            {/* Scrollable Navigation Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scrollbar-none">
                {/* Active Workspace Header Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${currentViewMeta.badgeColor}`}
                        >
                            {headerBadge}
                        </span>
                        <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${currentViewMeta.gradientBg} text-white shadow-xs`}
                        >
                            <ActiveIcon className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-1">
                            {headerTitle}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {headerDesc}
                        </p>
                    </div>
                </div>

                {/* Dynamic Navigation Sections */}
                <nav className="space-y-5">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {section.sectionTitle}
                            </div>
                            {section.items.map((item, itemIdx) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== '/' &&
                                        !item.href.includes('#') &&
                                        pathname.startsWith(item.href));
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={`${item.href}-${itemIdx}`}
                                        href={item.href}
                                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                                            isActive
                                                ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-bold'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon
                                                className={`h-4 w-4 ${
                                                    isActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400'
                                                }`}
                                            />
                                            <span>{item.label}</span>
                                        </div>
                                        {item.badge && (
                                            <span className="rounded bg-red-600 px-1.5 py-0.2 text-[9px] font-extrabold text-white animate-pulse">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Sticky Fixed Bottom AREENA Tag & Impressum Link */}
            <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs">
                <Link
                    href="/impressum"
                    className="group block rounded-xl border border-slate-200 bg-slate-50/80 hover:border-red-500/40 hover:bg-red-50/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-red-500/40 dark:hover:bg-red-950/20 p-2.5 transition"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                            <Sparkles className="h-3.5 w-3.5 text-red-500" />
                            <span>AREENA</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">v1.0</span>
                    </div>
                    <div className="mt-1 text-[9.5px] leading-tight text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                        Advanced Resource and Event Engine for Next-gen Associations
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-400">
                        <span>© {new Date().getFullYear()} AREENA</span>
                        <span className="text-red-600 dark:text-red-400 font-semibold group-hover:underline">
                            Impressum ↗
                        </span>
                    </div>
                </Link>
            </div>
        </aside>
    );
}
