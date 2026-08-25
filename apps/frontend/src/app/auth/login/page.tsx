'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { LogIn, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { resolvedTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.login({ email, password });
      login(res.token, res.user);
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="relative h-12 w-40 mx-auto">
            <Image
              key={logoSrc}
              src={logoSrc}
              alt="AREENA Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to AREENA</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your federation portal, license credentials, and tournament entries.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm dark:shadow-xl space-y-5 text-xs">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/80 p-3 text-red-800 dark:text-red-300">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address (Username)</label>
              <input
                type="email"
                required
                placeholder="name@example.ch"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition"
            >
              <LogIn className="h-4 w-4" />
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Demo Account Quick Switcher */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-red-500" />
              Quick Demo Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@areena.ch')}
                className="rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2 text-left hover:border-red-500/50 transition"
              >
                <div className="font-bold text-slate-900 dark:text-white text-[11px]">Super Admin</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">admin@areena.ch</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('club.zurich@areena.ch')}
                className="rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2 text-left hover:border-red-500/50 transition"
              >
                <div className="font-bold text-slate-900 dark:text-white text-[11px]">Club Admin</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">club.zurich@areena.ch</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('player.marco@areena.ch')}
                className="rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2 text-left hover:border-red-500/50 transition"
              >
                <div className="font-bold text-slate-900 dark:text-white text-[11px]">Regular Player</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">player.marco@areena.ch</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('instructor.reto@areena.ch')}
                className="rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2 text-left hover:border-red-500/50 transition"
              >
                <div className="font-bold text-slate-900 dark:text-white text-[11px]">Course Instructor</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">instructor.reto@areena.ch</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account yet?{' '}
          <Link href="/auth/register" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
            Register for Free
          </Link>
        </div>
      </div>
    </div>
  );
}
