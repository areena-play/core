'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    Cookie,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useAuth } from '@/lib/authContext';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
}

interface NavSection {
    sectionTitle: string;
    items: NavItem[];
}

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useI18n();
    const { user } = useAuth();
    const { activeView, entityId, entityMeta, currentViewMeta, mainAssoc, associations } = useMainView();

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
    const getNavSections = (): NavSection[] => {
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

        const currentAssocId = isSubAssoc ? entityId : (mainAssoc?.id || 'main');
        const currentAssoc = associations?.find((a: any) => a.id === currentAssocId) || (isSubAssoc ? null : mainAssoc);

        // Find direct child / sub-associations of the currently viewed association
        const directSubAssocs = (associations || []).filter((a: any) =>
            a.id !== currentAssoc?.id &&
            (
                a.parentHierarchies?.some((ph: any) => ph.parentId === currentAssoc?.id) ||
                currentAssoc?.childHierarchies?.some((ch: any) => ch.childId === a.id || ch.child?.id === a.id)
            )
        );

        const subAssocsSection = directSubAssocs.length > 0 ? [
            {
                sectionTitle: t('nav.subAssociations'),
                items: directSubAssocs.map((sub: any) => ({
                    label: sub.name,
                    href: `/association/${sub.id}`,
                    icon: Network,
                    badge: sub.code || sub.shortName,
                })),
            }
        ] : [];

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
            ...subAssocsSection,
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
                sectionTitle: 'Operations & Governance',
                items: [
                    ...(user?.isSuperAdmin
                        ? [{ label: t('nav.users'), href: '/users', icon: Users }]
                        : []),
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
        (activeView === 'association' ? (mainAssoc?.name || 'Sports Federation') : t(currentViewMeta.labelKey));
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
                                    </Link>
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
                    </div>
                </div>
            </div>
        </aside>
    );
}
