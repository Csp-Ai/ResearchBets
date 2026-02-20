'use client';

import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DEV_MODE_EVENT, readDeveloperMode } from '@/src/core/ui/preferences';

import { COPY_TOAST_EVENT } from './copyToast';

const BASE_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Research', href: '/research' },
  { label: 'Discover', href: '/discover' },
  { label: 'Community', href: '/community' },
  { label: 'Agents', href: '/agents' },
  { label: 'Settings', href: '/settings' }
];

const PRODUCT_PREFIXES = ['/', '/discover', '/ingest', '/research', '/pending-bets', '/traces', '/live', '/settings', '/community', '/agents', '/u'];

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

  const navItems = developerMode ? [...BASE_NAV_ITEMS, { label: 'Traces', href: '/traces' }] : BASE_NAV_ITEMS;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-4 lg:px-6">
      <header className="sticky top-2 z-40 mb-6 rounded-2xl border border-white/10 bg-slate-950/75 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-3 text-sm font-semibold text-cyan-200">ResearchBets</p>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl space-y-8 pb-10">{children}</main>
      {toast ? <div className="fixed bottom-5 right-5 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900">{toast}</div> : null}
    </div>
  );
}
