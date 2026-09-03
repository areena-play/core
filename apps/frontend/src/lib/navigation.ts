import React from 'react';
import {
    LayoutDashboard,
    Calendar,
    Trophy,
    Award,
    BookOpen,
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
    Megaphone,
    MessageSquare,
    UserCheck,
    BarChart3,
    DollarSign,
    Mic,
    Key,
    MapPin,
} from 'lucide-react';

export interface SubNavItem {
    id: string;
    label: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    badge?: string;
}

export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    children?: SubNavItem[];
}

export interface NavSection {
    sectionTitle?: string;
    items: NavItem[];
}

export interface GetNavSectionsParams {
    activeView: 'association' | 'club' | 'tournament' | 'admin';
    entityId?: string | null;
    pathname: string;
    t: (key: string) => string;
    user: any;
    mainAssoc: any;
    associations: any[];
}

export function getCommonNavSections({
    activeView,
    entityId,
    pathname,
    t,
    user,
    mainAssoc,
    associations,
}: GetNavSectionsParams): NavSection[] {
    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    // 0. SYSTEM ADMIN WORKSPACE VIEW
    if (activeView === 'admin') {
        return [
            {
                sectionTitle: 'Platform Root Control',
                items: [
                    {
                        id: 'admin-dashboard',
                        label: t('nav.adminDashboard') || 'Admin Dashboard',
                        href: '/admin',
                        icon: ShieldAlert,
                    },
                    {
                        id: 'system-settings',
                        label: t('nav.systemSettings') || 'System Settings',
                        href: '/admin/settings',
                        icon: Settings,
                    },
                ],
            },
            {
                sectionTitle: 'Global Governance',
                items: [
                    {
                        id: 'admin-users',
                        label: t('nav.users') || 'Global Users & Roles',
                        href: '/admin/users',
                        icon: Users,
                    },
                    {
                        id: 'admin-audit-logs',
                        label: t('nav.auditLogs') || 'Audit & Security Trail',
                        href: '/admin/audit-logs',
                        icon: Activity,
                    },
                    {
                        id: 'admin-communications',
                        label: t('nav.communications') || 'Communications & Notices',
                        href: '/admin/communications',
                        icon: Mail,
                    },
                ],
            },
        ];
    }

    // 1. TOURNAMENT WORKSPACE VIEW
    if (activeView === 'tournament' && entityId) {
        return [
            {
                sectionTitle: 'Dashboard',
                items: [
                    {
                        id: 'tournament-dashboard',
                        label: 'Tournament Dashboard',
                        href: `/competition/${entityId}`,
                        icon: Trophy,
                    },
                ],
            },
            {
                sectionTitle: t('tournamentWorkspace.navConfiguration') || 'Configuration',
                items: [
                    {
                        id: 'tournament-settings',
                        label: t('tournamentWorkspace.settings'),
                        href: `/competition/${entityId}/settings`,
                        icon: Settings,
                    },
                    {
                        id: 'tournament-access',
                        label: t('tournamentWorkspace.accessRights'),
                        href: `/competition/${entityId}/access`,
                        icon: Key,
                    },
                    {
                        id: 'tournament-locations',
                        label: t('tournamentWorkspace.locationsUnits'),
                        href: `/competition/${entityId}/locations`,
                        icon: MapPin,
                    },
                    {
                        id: 'tournament-referees',
                        label: t('tournamentWorkspace.referees'),
                        href: `/competition/${entityId}/referees`,
                        icon: UserCheck,
                    },
                ],
            },
            {
                sectionTitle: t('tournamentWorkspace.navCategories'),
                items: [
                    {
                        id: 'tournament-categories',
                        label: t('tournamentWorkspace.categoriesOverview'),
                        href: `/competition/${entityId}/categories`,
                        icon: Layers,
                    },
                ],
            },
            {
                sectionTitle: t('tournamentWorkspace.navOperations'),
                items: [
                    {
                        id: 'tournament-players',
                        label: t('tournamentWorkspace.players') || 'Players Roster',
                        href: `/competition/${entityId}/players`,
                        icon: Users,
                    },
                    {
                        id: 'tournament-results',
                        label: t('tournamentWorkspace.resultEntering'),
                        href: `/competition/${entityId}/results`,
                        icon: Flame,
                        badge: 'LIVE',
                    },
                    {
                        id: 'tournament-speaker',
                        label: t('tournamentWorkspace.speakerPage'),
                        href: `/competition/${entityId}/speaker`,
                        icon: Mic,
                    },
                    {
                        id: 'tournament-cashier',
                        label: t('tournamentWorkspace.cashierPage'),
                        href: `/competition/${entityId}/cashier`,
                        icon: DollarSign,
                    },
                ],
            },
            {
                sectionTitle: t('tournamentWorkspace.navInsights') || 'Insights & Control',
                items: [
                    {
                        id: 'tournament-communication',
                        label: t('tournamentWorkspace.communication'),
                        href: `/competition/${entityId}/communication`,
                        icon: MessageSquare,
                    },
                    {
                        id: 'tournament-actions',
                        label: t('tournamentWorkspace.actions') ,
                        href: `/competition/${entityId}/actions`,
                        icon: Activity,
                    },
                    {
                        id: 'tournament-statistics',
                        label: t('tournamentWorkspace.statistics'),
                        href: `/competition/${entityId}/statistics`,
                        icon: BarChart3,
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
                        id: 'club-overview',
                        label: t('clubWorkspace.overview'),
                        href: `/club/${entityId}`,
                        icon: Shield,
                    },
                    {
                        id: 'club-members',
                        label: t('clubWorkspace.members'),
                        href: `/club/${entityId}#members`,
                        icon: Users,
                    },
                    {
                        id: 'club-teams',
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
                        id: 'club-calendar',
                        label: t('clubWorkspace.calendar'),
                        href: `/calendar?clubId=${entityId}`,
                        icon: Calendar,
                    },
                    {
                        id: 'club-communications',
                        label: t('clubWorkspace.communications'),
                        href: `/communications?clubId=${entityId}`,
                        icon: Mail,
                    },
                ],
            },
        ];
    }

    // 3. MAIN & SUB-ASSOCIATION VIEWS (Dynamic Hierarchy Structure)
    const isSubAssoc =
        (pathname.startsWith('/association/') || pathname.startsWith('/associations/')) &&
        entityId &&
        entityId !== 'main';
    const subAssocPrefix = isSubAssoc ? `/association/${entityId}` : '';

    const assocOverviewHref = isSubAssoc ? `/association/${entityId}` : '/';
    const competitionsHref = isSubAssoc ? `${subAssocPrefix}/competitions` : '/competitions';
    const leaguesHref = `${competitionsHref}?type=league`;
    const tournamentsHref = `${competitionsHref}?type=tournament`;
    const seasonTournamentsHref = `${competitionsHref}?type=season_tournament`;
    const usersHref = isSubAssoc ? `${subAssocPrefix}/users` : '/users';
    const clubsHref = isSubAssoc ? `${subAssocPrefix}/clubs` : '/clubs';
    const coursesHref = isSubAssoc ? `${subAssocPrefix}/courses` : '/courses';
    const locationsHref = isSubAssoc ? `${subAssocPrefix}/locations` : '/locations';
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
                    assoc.parentHierarchies?.some(
                        (ph: any) => ph.parentId === parentId || ph.parent?.id === parentId
                    ) ||
                    allAssocs
                        .find((p) => p.id === parentId)
                        ?.childHierarchies?.some(
                            (ch: any) => ch.childId === assoc.id || ch.child?.id === assoc.id
                        );
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
    const currentAssoc =
        associations?.find(
            (a: any) =>
                a.id === currentAssocId ||
                a.slug === currentAssocId ||
                a.code?.toLowerCase() === currentAssocId.toLowerCase()
        ) || (isSubAssoc ? null : mainAssoc);

    // Resolve all descendant sub-associations (recursively, not just direct)
    const subAssocsList =
        isSubAssoc && currentAssoc?.id
            ? getAllDescendantAssocs(currentAssoc.id, associations || [])
            : (associations || []).filter((a: any) => !a.isTopLevel && a.id !== mainAssoc?.id);

    const sectionsList: NavSection[] = [
        // 1. Core Section: Dashboard, Competitions, People, Clubs, Refresher Courses, Calendar
        {
            items: [
                {
                    id: 'dashboard',
                    label: t('nav.dashboard'),
                    href: assocOverviewHref,
                    icon: LayoutDashboard,
                },
                {
                    id: 'competitions',
                    label: t('nav.competitions'),
                    href: competitionsHref,
                    icon: Trophy,
                    children: [
                        {
                            id: 'leagues',
                            label: t('nav.leagues'),
                            href: leaguesHref,
                        },
                        {
                            id: 'tournaments',
                            label: t('nav.tournamentsOnly'),
                            href: tournamentsHref,
                        },
                        {
                            id: 'season-tournaments',
                            label: t('nav.seasonTournaments'),
                            href: seasonTournamentsHref,
                        },
                    ],
                },
                {
                    id: 'people',
                    label: t('nav.people'),
                    href: usersHref,
                    icon: Users,
                    children: [
                        {
                            id: 'players',
                            label: t('nav.players'),
                            href: `${usersHref}?role=player`,
                        },
                        {
                            id: 'referees',
                            label: t('nav.referees'),
                            href: `${usersHref}?role=referee`,
                        },
                        {
                            id: 'coaches',
                            label: t('nav.coaches'),
                            href: `${usersHref}?role=coach`,
                        },
                        {
                            id: 'officials',
                            label: t('nav.officials'),
                            href: `${usersHref}?role=official`,
                        },
                    ],
                },
                {
                    id: 'club-overview',
                    label: t('nav.clubOverview'),
                    href: clubsHref,
                    icon: Shield,
                },
                {
                    id: 'refresher-courses',
                    label: t('nav.refresherCourses'),
                    href: coursesHref,
                    icon: GraduationCap,
                },
                {
                    id: 'locations',
                    label: t('nav.locations'),
                    href: locationsHref,
                    icon: MapPin,
                },
                {
                    id: 'calendar',
                    label: t('nav.calendar'),
                    href: calendarHref,
                    icon: Calendar,
                },
                {
                    id: 'associations',
                    label: t('nav.associationsSection'),
                    href: associationsHref,
                    icon: Building2,
                    children: [
                        ...subAssocsList.map((sub: any) => ({
                            id: sub.slug || sub.id,
                            label: sub.name,
                            href: `/association/${sub.slug || sub.id}`,
                            badge: sub.code || sub.shortName,
                        })),
                    ],
                },
            ],
        },

        // 2. Utility Section: Elo calculator, Level table, Developer API, Support, User Manual
        {
            sectionTitle: t('nav.utilitiesSection'),
            items: [
                {
                    id: 'elo-calculator',
                    label: t('nav.eloCalculator'),
                    href: eloCalculatorHref,
                    icon: Calculator,
                },
                {
                    id: 'level-table',
                    label: t('nav.levelTable'),
                    href: levelTableHref,
                    icon: TableIcon,
                },
                {
                    id: 'developer-api',
                    label: t('nav.developerApi'),
                    href: developerApiHref,
                    icon: Code2,
                },
                {
                    id: 'support',
                    label: t('nav.support'),
                    href: supportHref,
                    icon: HelpCircle,
                },
                {
                    id: 'user-manual',
                    label: t('nav.userManual') || 'User Manual',
                    href: '/manual',
                    icon: BookOpen,
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
                    id: 'management-dashboard',
                    label: t('nav.managementDashboard'),
                    href: mgmtPrefix,
                    icon: LayoutDashboard,
                },
                {
                    id: 'association-settings',
                    label: t('nav.associationSettings'),
                    href: `${mgmtPrefix}/settings`,
                    icon: Sliders,
                },
                {
                    id: 'association-users',
                    label: t('nav.users'),
                    href: `${mgmtPrefix}/users`,
                    icon: Users,
                },
                {
                    id: 'communications',
                    label: t('nav.communications'),
                    href: `${mgmtPrefix}/communications`,
                    icon: Mail,
                },
                {
                    id: 'licensing-hub',
                    label: t('nav.licensingHub'),
                    href: `${mgmtPrefix}/licenses`,
                    icon: Award,
                },
                {
                    id: 'competition-hub',
                    label: t('nav.competitionHub'),
                    href: `${mgmtPrefix}/competitions`,
                    icon: Trophy,
                },
                {
                    id: 'audit-logs',
                    label: t('nav.auditLogs'),
                    href: `${mgmtPrefix}/audit-logs`,
                    icon: Activity,
                },
                {
                    id: 'financing-hub',
                    label: t('nav.financingHub'),
                    href: `${mgmtPrefix}/finances`,
                    icon: Receipt,
                },
            ],
        });
    }

    return sectionsList;
}
