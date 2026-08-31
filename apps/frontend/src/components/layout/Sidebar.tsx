'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
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
    Cookie,
    HelpCircle,
    Calculator,
    Table as TableIcon,
    ChevronDown,
    ChevronRight,
    Building2,
    ShieldAlert,
    Settings,
    MapPin,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useAuth } from '@/lib/authContext';

interface SubNavItem {
    label: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    badge?: string;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    children?: SubNavItem[];
}

interface NavSection {
    sectionTitle?: string;
    items: NavItem[];
}

export function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const { user } = useAuth();
    const { activeView, entityId, entityMeta, currentViewMeta, mainAssoc, associations } = useMainView();

    // Track expanded status of collapsible groups (e.g. Competitions, People, Associations)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        competitions: true,
        people: true,
        associations: true,
        verbände: true,
        associazioni: true,
    });

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const ActiveIcon = currentViewMeta.icon;

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    // Build navigation items tailored for the active entity workspace
    const getNavSections = (): NavSection[] => {
        // 1. TOURNAMENT WORKSPACE VIEW
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

        // 2. CLUB WORKSPACE VIEW
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

        // 3. MAIN & SUB-ASSOCIATION VIEWS (Dynamic Hierarchy Structure)
        const isSubAssoc = (pathname.startsWith('/association/') || pathname.startsWith('/associations/')) && entityId && entityId !== 'main';
        const subAssocPrefix = isSubAssoc ? `/association/${entityId}` : '';

        const assocOverviewHref = isSubAssoc ? `/association/${entityId}` : '/';
        const competitionsHref = isSubAssoc ? `${subAssocPrefix}/competitions` : '/competitions';
        const leaguesHref = `${competitionsHref}?type=league`;
        const tournamentsHref = `${competitionsHref}?type=tournament`;
        const seasonTournamentsHref = `${competitionsHref}?type=season_tournament`;
        const usersHref = isSubAssoc ? `${subAssocPrefix}/users` : '/users';
        const clubsHref = isSubAssoc ? `${subAssocPrefix}/clubs` : '/clubs';
        const coursesHref = isSubAssoc ? `${subAssocPrefix}/courses` : '/courses';
        const calendarHref = isSubAssoc ? `${subAssocPrefix}/calendar` : '/calendar';
        const associationsHref = isSubAssoc ? `${subAssocPrefix}/associations` : '/associations';
        const eloCalculatorHref = isSubAssoc ? `${subAssocPrefix}/utilities/elo-calculator` : '/utilities/elo-calculator';
        const levelTableHref = isSubAssoc ? `${subAssocPrefix}/utilities/level-table` : '/utilities/level-table';
        const developerApiHref = '/developers';
        const supportHref = isSubAssoc ? `${subAssocPrefix}/support` : '/support';
        const mgmtPrefix = isSubAssoc ? `${subAssocPrefix}/management` : '/management';

        // Recursive DAG resolver to get ALL descendant sub-associations
        const getAllDescendantAssocs = (rootId: string, allAssocs: any[]): any[] => {
            const result: any[] = [];
            const visited = new Set<string>();

            const walk = (parentId: string) => {
                for (const assoc of allAssocs) {
                    if (assoc.id === parentId || visited.has(assoc.id)) continue;
                    const isChild =
                        assoc.parentHierarchies?.some((ph: any) => ph.parentId === parentId || ph.parent?.id === parentId) ||
                        allAssocs.find((p) => p.id === parentId)?.childHierarchies?.some((ch: any) => ch.childId === assoc.id || ch.child?.id === assoc.id);
                    if (isChild) {
                        visited.add(assoc.id);
                        result.push(assoc);
                        walk(assoc.id);
                    }
                }
            };

            if (rootId) {
                walk(rootId);
            }
            return result;
        };

        const currentAssocId = isSubAssoc ? entityId : (mainAssoc?.id || 'main');
        const currentAssoc = associations?.find((a: any) => a.id === currentAssocId || a.slug === currentAssocId || a.code?.toLowerCase() === currentAssocId.toLowerCase()) || (isSubAssoc ? null : mainAssoc);

        // Resolve all descendant sub-associations (recursively, not just direct)
        const subAssocsList = isSubAssoc && currentAssoc?.id
            ? getAllDescendantAssocs(currentAssoc.id, associations || [])
            : (associations || []).filter((a: any) => !a.isTopLevel && a.id !== mainAssoc?.id);

        const sectionsList: NavSection[] = [
            // 1. Core Section: Dashboard, Competitions, People, Clubs, Refresher Courses, Calendar
            {
                items: [
                    {
                        label: t('nav.dashboard'),
                        href: assocOverviewHref,
                        icon: LayoutDashboard,
                    },
                    {
                        label: t('nav.competitions'),
                        href: competitionsHref,
                        icon: Trophy,
                        children: [
                            {
                                label: t('nav.overview'),
                                href: competitionsHref,
                            },
                            {
                                label: t('nav.leagues'),
                                href: leaguesHref,
                            },
                            {
                                label: t('nav.tournamentsOnly'),
                                href: tournamentsHref,
                            },
                            {
                                label: t('nav.seasonTournaments'),
                                href: seasonTournamentsHref,
                            },
                        ],
                    },
                    {
                        label: t('nav.people'),
                        href: usersHref,
                        icon: Users,
                        children: [
                            {
                                label: t('nav.overview'),
                                href: usersHref,
                            },
                            {
                                label: t('nav.players'),
                                href: `${usersHref}?role=player`,
                            },
                            {
                                label: t('nav.referees'),
                                href: `${usersHref}?role=referee`,
                            },
                            {
                                label: t('nav.coaches'),
                                href: `${usersHref}?role=coach`,
                            },
                            {
                                label: t('nav.officials'),
                                href: `${usersHref}?role=official`,
                            },
                        ],
                    },
                    {
                        label: t('nav.clubOverview'),
                        href: clubsHref,
                        icon: Shield,
                    },
                    {
                        label: t('nav.refresherCourses'),
                        href: coursesHref,
                        icon: GraduationCap,
                    },
                    {
                        label: t('nav.locations') || 'Locations',
                        href: '/locations',
                        icon: MapPin,
                    },
                    {
                        label: t('nav.calendar'),
                        href: calendarHref,
                        icon: Calendar,
                    },
                    {
                        label: t('nav.associationsSection'),
                        href: associationsHref,
                        icon: Building2,
                        children: [
                            {
                                label: t('nav.overview'),
                                href: associationsHref,
                            },
                            ...subAssocsList.map((sub: any) => ({
                                label: sub.name,
                                href: `/association/${sub.slug || sub.id}`,
                                badge: sub.code || sub.shortName,
                            })),
                        ],
                    },
                ],
            },

            // 2. Utility Section: Elo calculator, Level table, Developer API, Support
            {
                sectionTitle: t('nav.utilitiesSection'),
                items: [
                    {
                        label: t('nav.eloCalculator'),
                        href: eloCalculatorHref,
                        icon: Calculator,
                    },
                    {
                        label: t('nav.levelTable'),
                        href: levelTableHref,
                        icon: TableIcon,
                    },
                    {
                        label: t('nav.developerApi'),
                        href: developerApiHref,
                        icon: Code2,
                    },
                    {
                        label: t('nav.support'),
                        href: supportHref,
                        icon: HelpCircle,
                    },
                ],
            },
        ];

        // 3. Operations / Governance Section: Shown to Association Admins
        if (isAssocAdmin) {
            sectionsList.push({
                sectionTitle: t('nav.operationsGovernance'),
                items: [
                    {
                        label: t('nav.managementDashboard'),
                        href: mgmtPrefix,
                        icon: LayoutDashboard,
                    },
                    {
                        label: t('nav.associationSettings'),
                        href: `${mgmtPrefix}/settings`,
                        icon: Sliders,
                    },
                    {
                        label: t('nav.users'),
                        href: `${mgmtPrefix}/users`,
                        icon: Users,
                    },
                    {
                        label: t('nav.communications'),
                        href: `${mgmtPrefix}/communications`,
                        icon: Mail,
                    },
                    {
                        label: t('nav.licensingHub'),
                        href: `${mgmtPrefix}/licenses`,
                        icon: Award,
                    },
                    {
                        label: t('nav.auditLogs'),
                        href: `${mgmtPrefix}/audit-logs`,
                        icon: Activity,
                    },
                    {
                        label: t('nav.financingHub'),
                        href: `${mgmtPrefix}/finances`,
                        icon: Receipt,
                    },
                ],
            });
        }

        // 4. Super Admin Section: Visible ONLY to Super Admins
        if (user?.isSuperAdmin) {
            sectionsList.push({
                sectionTitle: t('nav.superAdminSection'),
                items: [
                    {
                        label: t('nav.adminDashboard'),
                        href: '/admin',
                        icon: ShieldAlert,
                    },
                    {
                        label: t('nav.systemSettings'),
                        href: '/admin/settings',
                        icon: Settings,
                    },
                ],
            });
        }

        return sectionsList;
    };

    const sections = getNavSections();

    // Determine header card contents
    const headerTitle =
        entityMeta?.title ||
        (activeView === 'association' ? (mainAssoc?.name || 'Sports Federation') : t(currentViewMeta.labelKey));
    const headerBadge = entityMeta?.badge || t(currentViewMeta.badgeKey);
    const headerDesc = entityMeta?.subtitle || t(currentViewMeta.descKey);

    // Precise active navigation resolver
    const isNavActive = (targetHref: string) => {
        if (!targetHref) return false;
        const [targetPath, targetQuery] = targetHref.split('?');

        // 1. If targetHref has query params (e.g. ?type=league or ?role=player)
        if (targetQuery) {
            if (pathname !== targetPath) return false;
            const targetParams = new URLSearchParams(targetQuery);
            for (const [key, value] of targetParams.entries()) {
                if (searchParams.get(key)?.toLowerCase() !== value.toLowerCase()) {
                    return false;
                }
            }
            return true;
        }

        // 2. If targetHref has NO query params:
        // Exact pathname match ONLY. When specific query params are present (type or role),
        // do not keep the bare parent overview item highlighted.
        if (pathname === targetPath) {
            if (searchParams.has('type') || searchParams.has('role')) {
                return false;
            }
            return true;
        }

        return false;
    };

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

                    {/* Return to Main Starting Page Link */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition group"
                        >
                            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
                            <span>Return to Main Starting Page</span>
                        </Link>
                    </div>
                </div>

                {/* Dynamic Navigation Sections */}
                <nav className="space-y-5">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            {section.sectionTitle && (
                                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {section.sectionTitle}
                                </div>
                            )}
                            {section.items.map((item, itemIdx) => {
                                const hasChildren = item.children && item.children.length > 0;
                                const isGroupExpanded = expandedGroups[item.label.toLowerCase()] ?? true;
                                const isItemActive = isNavActive(item.href);

                                const Icon = item.icon;

                                return (
                                    <div key={`${item.href}-${itemIdx}`} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Link
                                                href={item.href}
                                                className={`flex-1 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                                                    isItemActive && !hasChildren
                                                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-bold'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Icon
                                                        className={`h-4 w-4 ${
                                                            isItemActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400'
                                                        }`}
                                                    />
                                                    <span>{item.label}</span>
                                                </div>
                                            </Link>
                                            {hasChildren && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(item.label.toLowerCase())}
                                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                                >
                                                    {isGroupExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Render Collapsible Children Sub-Links */}
                                        {hasChildren && isGroupExpanded && (
                                            <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800/80 space-y-1 pt-0.5">
                                                {item.children!.map((sub, subIdx) => {
                                                    const isSubActive = isNavActive(sub.href);

                                                    return (
                                                        <Link
                                                            key={`${sub.href}-${subIdx}`}
                                                            href={sub.href}
                                                            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                                                                isSubActive
                                                                    ? 'text-red-600 dark:text-red-400 font-bold bg-red-50/50 dark:bg-red-950/30'
                                                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                                                            }`}
                                                        >
                                                            <span>{sub.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Sticky Fixed Bottom AREENA Tag & Legal Links */}
            <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs">
                <div className="block rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 p-2.5 transition">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                            <div className="relative h-4 w-4 shrink-0">
                                <Image src="/icon.svg" alt="AREENA" fill className="object-contain" />
                            </div>
                            <span>AREENA</span>
                            <span className="text-[9.5px] font-normal text-slate-400">© {new Date().getFullYear()}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">v1.0</span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[8.5px] text-slate-400 dark:text-slate-500">
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(
                                        new CustomEvent('areena:open-cookie-settings'),
                                    );
                                }
                            }}
                            className="flex items-center gap-0.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            <Cookie className="h-2.5 w-2.5 text-amber-500/80" />
                            <span>{t('cookieConsent.shortLabel')}</span>
                        </button>
                        <Link
                            href="/data-protection"
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            {t('nav.dataProtection')}
                        </Link>
                        <Link
                            href="/impressum"
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            {t('nav.impressum')}
                        </Link>
                        <Link
                            href="/support"
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            Support
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}