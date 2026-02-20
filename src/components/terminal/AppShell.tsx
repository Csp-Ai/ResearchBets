'use client';

import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DEV_MODE_EVENT, LIVE_MODE_EVENT, readDeveloperMode, readLiveModeEnabled, writeLiveModeEnabled } from '@/src/core/ui/preferences';

import { COPY_TOAST_EVENT } from './copyToast';

const BASE_NAV_ITEMS = [
  { label: 'Research', href: '/research' },
  { label: 'Scout', href: '/discover' },
  { label: 'Live', href: '/live' },
  { label: 'Community', href: '/community' }
];

const PRODUCT_PREFIXES = ['/', '/discover', '/ingest', '/research', '/pending-bets', '/traces', '/live', '/settings', '/community', '/agents', '/u', '/dev'];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    setLiveMode(readLiveModeEnabled());
    const onModeChange = () => setDeveloperMode(readDeveloperMode());
    const onLiveModeChange = () => setLiveMode(readLiveModeEnabled());
    window.addEventListener(DEV_MODE_EVENT, onModeChange);
    window.addEventListener(LIVE_MODE_EVENT, onLiveModeChange);
    window.addEventListener('storage', onModeChange);
    window.addEventListener('storage', onLiveModeChange);
    return () => {
      window.removeEventListener(DEV_MODE_EVENT, onModeChange);
      window.removeEventListener(LIVE_MODE_EVENT, onLiveModeChange);
      window.removeEventListener('storage', onModeChange);
      window.removeEventListener('storage', onLiveModeChange);
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

  const navItems = developerMode ? [...BASE_NAV_ITEMS, { label: 'Profile', href: '/u/me' }] : BASE_NAV_ITEMS;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-6 lg:px-6">
      <header className="sticky top-2 z-40 mb-8 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="mr-2 text-base font-semibold text-white">ResearchBets</p>
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/discover" className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950">Analyze Slip</Link>
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full border border-white/15 px-2 py-1 text-xs text-slate-200">⚙</summary>
              <div className="absolute right-0 mt-2 w-36 rounded-lg border border-white/10 bg-slate-900 p-2 text-sm">
                <Link href="/settings" className="block rounded px-2 py-1 text-slate-200 hover:bg-white/10">Settings</Link>
                {developerMode ? <Link href="/dev/dashboard" className="mt-1 block rounded px-2 py-1 text-slate-200 hover:bg-white/10">Dev dashboard</Link> : null}
                {process.env.NODE_ENV !== 'production' ? (
                  <button
                    type="button"
                    onClick={() => writeLiveModeEnabled(!liveMode)}
                    className="mt-1 w-full rounded px-2 py-1 text-left text-slate-200 hover:bg-white/10"
                  >
                    Live Mode: {liveMode ? 'On' : 'Off'}
                  </button>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl space-y-8 pb-10">{children}</main>
      {toast ? <div className="fixed bottom-5 right-5 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900">{toast}</div> : null}
    </div>
  );
}
