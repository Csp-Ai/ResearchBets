'use client';

import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DEV_MODE_EVENT, readDeveloperMode } from '@/src/core/ui/preferences';

import { COPY_TOAST_EVENT } from './copyToast';

const BASE_NAV_ITEMS = [
  { label: 'Analyze', href: '/research' },
  { label: 'Build', href: '/discover' },
  { label: 'Bets', href: '/pending-bets' },
  { label: 'Settings', href: '/settings' },
];

const PRODUCT_PREFIXES = ['/', '/dashboard', '/discover', '/ingest', '/research', '/pending-bets', '/traces', '/live', '/settings'];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    const onModeChange = () => setDeveloperMode(readDeveloperMode());
    window.addEventListener(DEV_MODE_EVENT, onModeChange);
    window.addEventListener('storage', onModeChange);
    return () => {
      window.removeEventListener(DEV_MODE_EVENT, onModeChange);
      window.removeEventListener('storage', onModeChange);
    };
  }, []);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setToast(detail?.message ?? 'Copied');
      window.setTimeout(() => setToast(null), 1300);
    };
    window.addEventListener(COPY_TOAST_EVENT, onToast);
    return () => window.removeEventListener(COPY_TOAST_EVENT, onToast);
  }, []);

  const isProduct = useMemo(
    () => PRODUCT_PREFIXES.some((prefix) => (prefix === '/' ? pathname === '/' : pathname?.startsWith(prefix))),
    [pathname]
  );

  if (!isProduct) return <>{children}</>;

  const navItems = developerMode ? [...BASE_NAV_ITEMS, { label: 'Run details', href: '/traces' }] : BASE_NAV_ITEMS;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] px-3 py-4 lg:px-6">
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">ResearchBets</p>
          <p className="mb-3 text-[11px] text-slate-500">Decision-first bettor workflow</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded px-3 py-2 text-sm ${active ? 'bg-cyan-900/35 text-cyan-100' : 'text-slate-300 hover:bg-slate-800/80'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-2 text-sm text-slate-400">Betting workspace</div>
          {children}
        </div>
      </div>
      {toast ? <div className="fixed bottom-5 right-5 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900">{toast}</div> : null}
    </div>
  );
}
