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
  User,
  Sliders,
  CheckSquare,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Master Calendar', href: '/calendar', icon: Calendar },
    { label: 'Competitions & Leagues', href: '/competitions', icon: Trophy },
    { label: 'License Hub', href: '/licenses', icon: Award },
    { label: 'Refresher Courses', href: '/licenses/refresher-courses', icon: GraduationCap },
    { label: 'Approvals Queue', href: '/licenses/approvals', icon: CheckSquare },
    { label: 'Associations & Clubs', href: '/associations', icon: Network },
    { label: 'Association Settings', href: '/associations/settings', icon: Sliders },
    { label: 'Communications', href: '/communications', icon: Mail },
    { label: 'Developer API (OAuth)', href: '/developers', icon: Code2 },
    { label: 'My Profile', href: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/60 hidden md:block transition-colors duration-200">
      <div className="flex h-full flex-col justify-between p-4">
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Platform Navigation
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Association Branding Badge at bottom */}
        <div className="rounded-xl border border-slate-200 bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/50 p-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="font-semibold text-slate-900 dark:text-slate-300">AREENA Core v1.0</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Unified National & Regional Federation Platform
          </div>
        </div>
      </div>
    </aside>
  );
}
