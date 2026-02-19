'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { COPY_TOAST_EVENT } from './copyToast';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Ingest', href: '/ingest' },
  { label: 'Research', href: '/research' },
  { label: 'Bets', href: '/pending-bets' },
  { label: 'Traces', href: '/traces' },
];

const PRODUCT_PREFIXES = ['/', '/dashboard', '/ingest', '/research', '/pending-bets', '/traces', '/live'];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);

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

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] px-3 py-4 lg:px-6">
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">ResearchBets</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded px-3 py-2 text-sm ${active ? 'bg-cyan-900/40 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-400">Terminal workspace</div>
          {children}
        </div>
      </div>
      {toast ? <div className="fixed bottom-5 right-5 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900">{toast}</div> : null}
    </div>
  );
}
