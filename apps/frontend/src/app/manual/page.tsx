'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18nContext';
import { useTheme } from '@/lib/themeContext';
import {
    BookOpen,
    Users,
    Shield,
    Building2,
    ShieldAlert,
    UserCheck,
    Trophy,
    Award,
    Flame,
    Calculator,
    Settings,
    Mail,
    Search,
    ChevronLeft,
    CheckCircle2,
    HelpCircle,
    ArrowRight,
    Sparkles,
    Key,
    Receipt,
    Activity,
    Layers,
} from 'lucide-react';

type RoleTab = 'PLAYER' | 'REFEREE' | 'CLUB_ADMIN' | 'ASSOC_ADMIN' | 'SUPER_ADMIN';

export default function UserManualPage() {
    const { t } = useI18n();
    const { resolvedTheme } = useTheme();
    const [activeRole, setActiveRole] = useState<RoleTab>('PLAYER');
    const [searchQuery, setSearchQuery] = useState('');

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    const rolesConfig = [
        {
            id: 'PLAYER' as RoleTab,
            label: 'Players & Athletes',
            icon: Users,
            badge: 'Athlete Level',
            color: 'from-blue-600 to-indigo-700',
            borderColor: 'border-blue-500/30',
            tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
            description: 'Access digital player passes, check license status, view personal ELO ratings, match schedules, and register for tournaments.',
        },
        {
            id: 'REFEREE' as RoleTab,
            label: 'Referees & Umpires',
            icon: UserCheck,
            badge: 'Official / Referee',
            color: 'from-emerald-600 to-teal-700',
            borderColor: 'border-emerald-500/30',
            tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
            description: 'Complete mandatory refresher courses, manage referee licenses, enter live set-by-set scoresheet results, and arbitrate tournament fixtures.',
        },
        {
            id: 'CLUB_ADMIN' as RoleTab,
            label: 'Club Administrators',
            icon: Shield,
            badge: 'Club Governance',
            color: 'from-amber-600 to-orange-700',
            borderColor: 'border-amber-500/30',
            tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            description: 'Manage club members, team rosters, venue facilities and tables, submit player license applications, and organize home fixtures.',
        },
        {
            id: 'ASSOC_ADMIN' as RoleTab,
            label: 'Association & Federation Admins',
            icon: Building2,
            badge: 'Federation Governance',
            color: 'from-red-600 to-rose-700',
            borderColor: 'border-red-500/30',
            tagColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
            description: 'Govern sub-associations in DAG hierarchy, approve competitions, issue licenses, manage tournament hubs, configure Bexio billing, and run referee education.',
        },
        {
            id: 'SUPER_ADMIN' as RoleTab,
            label: 'Super Administrators',
            icon: ShieldAlert,
            badge: 'Platform Root',
            color: 'from-purple-600 to-violet-800',
            borderColor: 'border-purple-500/30',
            tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
            description: 'System health monitoring, cross-tenant user administration, Mailgun / SMTP credential configuration, audit explorer, and database JSON dump/import.',
        },
    ];

    const currentRole = rolesConfig.find((r) => r.id === activeRole)!;

    const manuals: Record<RoleTab, { section: string; title: string; steps: string[]; tips?: string }[]> = {
        PLAYER: [
            {
                section: '1. Onboarding & Account Access',
                title: 'Logging In and Setting Up Your Profile',
                steps: [
                    'Access AREENA at your federation domain and sign in with your email address or SSO credentials.',
                    'Check your personal dashboard to review your assigned club affiliation and seasonal license status.',
                    'Verify that your contact details (name, email, phone) are up to date in your Profile Settings.',
                ],
                tips: 'If your club affiliation is missing, contact your club administrator to be linked to the club roster.',
            },
            {
                section: '2. License Management',
                title: 'Applying for and Viewing Your Seasonal License',
                steps: [
                    'Navigate to the "Licenses" menu in the sidebar.',
                    'Click "Apply for License", select your sports discipline and category (e.g., Active Player / Senior / Junior).',
                    'Once approved by your club and federation, your Digital License Pass is activated with a verified QR code.',
                    'Check your license validity date before competing in official tournaments or championship fixtures.',
                ],
            },
            {
                section: '3. Competitions & Match Center',
                title: 'Finding Fixtures, Entering Results & Viewing Standings',
                steps: [
                    'Browse active leagues and season-long tournaments from the "Competitions" sidebar section.',
                    'View your team schedule, assigned tables/units, venue locations, and start times.',
                    'Follow live fixture scores via the Live Ticker on any competition dashboard.',
                    'Review your match history and calculated Elo ranking adjustments after every encounter.',
                ],
            },
            {
                section: '4. Utilities & Tools',
                title: 'Elo Rating Calculator & Classification Table',
                steps: [
                    'Use the "Elo Calculator" under Utilities to simulate rating point gains/losses against any opponent.',
                    'Consult the "Level / Elo Table" to view the official Swiss skill tier classification (D1 to A20).',
                ],
            },
        ],
        REFEREE: [
            {
                section: '1. Referee Licensing & Qualification',
                title: 'Referee License Passport & Validity Rules',
                steps: [
                    'Apply for a Referee License through the Licenses module.',
                    'Federation rules may require a valid refresher course every 24 months to maintain active referee status.',
                    'Check your active certification badge on your profile and digital pass.',
                ],
                tips: 'A countdown notification banner will alert you when your refresher certification is due for renewal.',
            },
            {
                section: '2. Refresher Courses',
                title: 'Enrolling & Attending Continuing Education Courses',
                steps: [
                    'Navigate to "Refresher Courses" in the sidebar.',
                    'Browse upcoming courses organized by your regional association or national federation.',
                    'Click "Register for Course" to book your seat.',
                    'Upon course completion, your instructor will confirm your attendance, automatically extending your license validity.',
                ],
            },
            {
                section: '3. Match Scoresheet & Result Entry Desk',
                title: 'Live Encounter Arbitration & Set-by-Set Score Entry',
                steps: [
                    'On competition day, navigate to the tournament / league match center (/competition/[id]/results).',
                    'Open the individual match scoresheet (/competition/[id]/encounter/[encounterId]).',
                    'Input points for each set (e.g. 11-9, 8-11, 11-7). The system calculates winner, set points, and match status automatically.',
                    'Confirm match completion to finalize the scoresheet and trigger live group standing and Elo calculations.',
                ],
            },
        ],
        CLUB_ADMIN: [
            {
                section: '1. Club Workspace & Overview',
                title: 'Managing Your Member Club & Club Settings',
                steps: [
                    'Switch to your Club Workspace using the workspace switcher in the navigation bar.',
                    'Review your club overview, member count, registered teams, and upcoming calendar events.',
                    'Update club contact information, home venues, and training schedules.',
                ],
            },
            {
                section: '2. Member Roster & Role Assignments',
                title: 'Adding Members, Players & Club Staff',
                steps: [
                    'Navigate to the Members tab in your club workspace.',
                    'Invite or assign users to club roles (Member, Club Admin, Team Captain, Coach).',
                    'Review pending license requests from your players and endorse them for federation approval.',
                ],
            },
            {
                section: '3. Team Registrations & Category Draws',
                title: 'Entering Teams into Leagues and Tournaments',
                steps: [
                    'Create club teams and assign registered players to team rosters.',
                    'Register teams into regional leagues or open tournament categories.',
                    'Ensure all team members possess an active, valid federation license prior to competition start.',
                ],
            },
            {
                section: '4. Venue & Table Reservations',
                title: 'Managing Sports Locations and Unit Bookings',
                steps: [
                    'Access the "Locations" page to inspect your club home hall.',
                    'View table / court availability and create training or match-day reservation blocks.',
                ],
            },
        ],
        ASSOC_ADMIN: [
            {
                section: '1. Association Management & DAG Hierarchy',
                title: 'Federation Administration & Sub-Association Governance',
                steps: [
                    'Access the "Management Dashboard" from the Operations & Governance sidebar section.',
                    'Configure federation identity, rules (e.g. max foreigners per team, dual registration rules), and season dates in Association Settings.',
                    'Inspect sub-associations in the directed acyclic graph (DAG) structure with inherited rule propagation.',
                ],
            },
            {
                section: '2. Tournament Hub: Approvals & Result Validation',
                title: 'Approving New Competitions and Validating Finished Results',
                steps: [
                    'Open the "Tournament Hub" under Operations & Governance (/management/competitions).',
                    'Review pending tournament applications created by member clubs. Click "Approve" to publish or "Reject" with justification.',
                    'Inspect finished tournaments in the "Results Validation" queue. Review final match logs and click "Validate Results" to lock standings and apply official Elo points.',
                ],
            },
            {
                section: '3. Licensing Hub & Approvals Queue',
                title: 'Processing License Applications & Refresher Tracking',
                steps: [
                    'Navigate to the "Licensing Hub" to review pending player and referee license requests.',
                    'Approve verified applicants to generate unique license numbers according to your custom license template.',
                    'Schedule and manage federation refresher courses and certify course attendance.',
                ],
            },
            {
                section: '4. Financing Hub & Bexio Invoicing',
                title: 'Fee Collection, Swiss QR-Bills & Bexio Accounting Sync',
                steps: [
                    'Open the "Financing Hub" (/management/finances) to view billing dashboard metrics.',
                    'Issue membership fee invoices or competition entry fee collection bills to member clubs or players.',
                    'Generate compliant Swiss QR-Bills and synchronize invoices directly with Bexio cloud accounting.',
                ],
            },
        ],
        SUPER_ADMIN: [
            {
                section: '1. Super Admin Dashboard & System Health',
                title: 'Platform Infrastructure & Core Services Health Matrix',
                steps: [
                    'Navigate to the "Admin Dashboard" (/admin) to monitor database status, Mailgun REST gateway, SMTP relay, and Redis token bucket ingress.',
                    'Review platform-wide counters: total registered users, associations, clubs, competitions, licenses, and invoices.',
                ],
            },
            {
                section: '2. System Configuration & Mail Gateways',
                title: 'Configuring Mailgun REST and SMTP Relay Settings',
                steps: [
                    'Go to "System Settings" (/admin/settings) to configure Mailgun API key, domain, regional API host, and default sender identity.',
                    'Configure SMTP credentials (host, port, user, TLS/SSL) as a fallback relay.',
                    'Use the built-in "Send Live Test" tool to verify email dispatch deliverability in real time.',
                ],
            },
            {
                section: '3. Database Backup & JSON Dump / Import',
                title: 'Full Database Export and JSON Snapshot Restore',
                steps: [
                    'Open "System Settings" and scroll to the "Database Backup & JSON Dump / Import" module.',
                    'Click "Download Database JSON Dump" to export all platform tables into a timestamped JSON file.',
                    'To restore from a backup, click "Select JSON File & Restore", confirm the overwrite warning prompt, and allow the system to import the snapshot.',
                ],
                tips: 'Always download a fresh backup before performing major system upgrades or imports.',
            },
            {
                section: '4. User Governance & Audit Explorer',
                title: 'Managing SuperAdmins and Inspecting Global Audit Trails',
                steps: [
                    'Promote or demote Super Administrator privileges from the User Management module (/management/users).',
                    'Inspect the Global Audit Trail (/management/audit-logs) to trace security events, administrative updates, and system operations.',
                ],
            },
        ],
    };

    const currentSections = manuals[activeRole];

    const filteredSections = currentSections.filter((sec) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            sec.title.toLowerCase().includes(q) ||
            sec.section.toLowerCase().includes(q) ||
            sec.steps.some((s) => s.toLowerCase().includes(q)) ||
            (sec.tips && sec.tips.toLowerCase().includes(q))
        );
    });

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{t('common.back')}</span>
                </Link>
                <div className="flex items-center gap-4 text-xs font-semibold">
                    <Link
                        href="/support"
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                    >
                        Support & Help Desk
                    </Link>
                    <Link
                        href="/impressum"
                        className="text-red-600 dark:text-red-400 hover:underline transition"
                    >
                        Impressum & Legal
                    </Link>
                </div>
            </div>

            {/* Header Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-10 shadow-sm dark:shadow-xl space-y-4">
                <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>AREENA Comprehensive User Manual</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Platform User Guide & Role Manual
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Complete reference guide and step-by-step operating manuals for athletes, certified referees, club managers, association directors, and system administrators.
                        </p>
                    </div>

                    <div className="relative h-12 w-36 sm:h-14 sm:w-44 shrink-0">
                        <Image
                            key={logoSrc}
                            src={logoSrc}
                            alt="AREENA Logo"
                            fill
                            priority
                            className="object-contain"
                        />
                    </div>
                </div>
                <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-500/5 blur-3xl dark:bg-red-500/10" />
            </div>

            {/* Role Selection Tabs */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Your Role or Workspace
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {rolesConfig.map((role) => {
                        const Icon = role.icon;
                        const isSelected = activeRole === role.id;
                        return (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setActiveRole(role.id)}
                                className={`rounded-2xl p-4 text-left border transition shadow-xs flex flex-col justify-between gap-3 ${
                                    isSelected
                                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 ring-2 ring-red-500/20'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div
                                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                            isSelected
                                                ? 'bg-red-600 text-white'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${role.tagColor}`}
                                    >
                                        {role.badge}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {role.label}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Role Header Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md">
                            {React.createElement(currentRole.icon, { className: 'h-6 w-6' })}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentRole.tagColor}`}>
                                    {currentRole.badge}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">AREENA v{process.env.NEXT_PUBLIC_APP_VERSION} Role Manual</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {currentRole.label} Guide
                            </h2>
                        </div>
                    </div>

                    {/* Search in manual */}
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search instructions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
                        />
                    </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {currentRole.description}
                </p>
            </div>

            {/* Manual Instruction Modules */}
            <div className="space-y-6">
                {filteredSections.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
                        <HelpCircle className="h-8 w-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            No instructions found matching "{searchQuery}".
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-xs font-bold text-red-600 hover:underline"
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    filteredSections.map((sec, idx) => (
                        <div
                            key={idx}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-4"
                        >
                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                <span>{sec.section}</span>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                {sec.title}
                            </h3>

                            <div className="space-y-3 pt-2">
                                {sec.steps.map((step, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[11px] font-bold mt-0.5">
                                            {sIdx + 1}
                                        </div>
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>

                            {sec.tips && (
                                <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <strong className="font-semibold">Pro Tip: </strong>
                                        <span>{sec.tips}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Quick Links Footer */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 sm:p-8 space-y-4 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Need Further Assistance?
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Browse frequently asked questions or submit an inquiry to your federation help desk.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/support"
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-bold shadow transition flex items-center gap-1.5"
                        >
                            <span>Support & Help Desk</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
