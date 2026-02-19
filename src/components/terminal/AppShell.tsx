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
const BETTOR_ROUTES = ['/research', '/ingest', '/discover'];

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
  const showWorkspaceLine = developerMode || !BETTOR_ROUTES.some((route) => pathname?.startsWith(route));

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1360px] px-3 py-5 lg:px-6">
      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="rb-card h-fit p-3.5">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">ResearchBets</p>
          <p className="mb-3 text-[11px] text-slate-500">Decision-first bettor workflow</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm ${active ? 'bg-cyan-900/30 text-cyan-100' : 'text-slate-300 hover:bg-slate-800/60'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="space-y-6">
          {showWorkspaceLine ? (
            <div className="text-xs text-slate-500">
              <span>ResearchBets</span>
              <span className="mx-2 text-slate-600">/</span>
              <span className="capitalize">{pathname?.replace('/', '') || 'home'}</span>
            </div>
          ) : null}
          <main className="mx-auto w-full max-w-5xl space-y-8 pb-10">{children}</main>
        </div>
      </div>
      {toast ? <div className="fixed bottom-5 right-5 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900">{toast}</div> : null}
    </div>
  );
}
