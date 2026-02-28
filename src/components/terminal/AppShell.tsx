'use client';

import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { DEV_MODE_EVENT, LIVE_MODE_EVENT, readDeveloperMode, readLiveModeEnabled, writeLiveModeEnabled } from '@/src/core/ui/preferences';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

import { COPY_TOAST_EVENT } from './copyToast';
import { ContextBadge } from '@/src/components/nervous/ContextBadge';
import { ContextHeaderStrip } from '@/src/components/nervous/ContextHeaderStrip';
import { NervousSystemProvider, useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { SurfaceHeaderBar } from './SurfaceHeaderBar';

const BASE_NAV_ITEMS = [
  { label: 'Board', href: '/today' },
  { label: 'Slip', href: '/slip' },
  { label: 'Stress Test', href: '/stress-test' },
  { label: 'Control Room', href: '/control' }
];

const PRODUCT_PREFIXES = ['/today', '/slip', '/stress-test', '/control', '/discover', '/ingest', '/research', '/pending-bets', '/live', '/settings', '/u', '/dev'];
const RAIL_ROUTES = ['/today', '/slip', '/stress-test', '/control'];

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);
  const { slip, removeLeg, clearSlip } = useDraftSlip();
  const nervous = useNervousSystem();

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
  const showRail = useMemo(
    () => RAIL_ROUTES.some((route) => (route === '/' ? pathname === '/' : pathname?.startsWith(route))),
    [pathname]
  );

  if (!isProduct) return <>{children}</>;

  const toStressTest = () => {
    const prefillText = serializeDraftSlip(slip);
    if (!prefillText || typeof window === 'undefined') {
      router.push(nervous.toHref('/stress-test'));
      return;
    }
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(nervous.toHref('/stress-test', { tab: 'analyze', prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY }));
  };

  const toStressTestFromDrawer = () => {
    setMobileSlipOpen(false);
    toStressTest();
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
      <header className="sticky top-2 z-40 mb-4 hidden rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur sm:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="mr-1 text-sm font-semibold text-white">ResearchBets</p>
            {BASE_NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={nervous.toHref(item.href)} className={`rounded-md px-2.5 py-1 text-sm transition ${active ? 'border border-cyan-300/40 bg-cyan-400/20 text-cyan-100' : 'text-slate-300 hover:bg-white/10'}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <ContextBadge />
            <button type="button" onClick={toStressTest} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950">Stress Test ({slip.length})</button>
            <details className="relative">
              <summary className="terminal-focus cursor-pointer list-none rounded-full border border-white/15 px-2 py-1 text-xs text-slate-200">⚙</summary>
              <div className="absolute right-0 mt-2 w-36 rounded-lg border border-white/10 bg-slate-900 p-2 text-sm">
                <Link href={nervous.toHref('/settings')} className="block rounded px-2 py-1 text-slate-200 hover:bg-white/10">Settings</Link>
                {developerMode ? <Link href={nervous.toHref('/dev/dashboard')} className="mt-1 block rounded px-2 py-1 text-slate-200 hover:bg-white/10">Dev dashboard</Link> : null}
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
      <ContextHeaderStrip />
      <SurfaceHeaderBar />
      <div className={`grid gap-6 ${showRail ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <main className="min-w-0 space-y-6 pb-28 sm:pb-10">{children}</main>
        <aside className={`sticky top-20 hidden h-fit space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 ${showRail ? 'lg:block' : ''}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Draft Slip</h2>
            {slip.length > 0 ? <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={clearSlip}>Clear</button> : null}
          </div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pipeline: Browse → Add → Slip → Stress Test</p>
          {slip.length === 0 ? <p className="text-xs text-slate-400">Add props from Board to start a stress-ready ticket.</p> : (
            <ul className="space-y-2 text-xs">
              {slip.map((leg) => (
                <li key={leg.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
                  <p className="font-medium">{leg.player}</p>
                  <p className="text-slate-400">{leg.marketType} {leg.line} {leg.odds ?? ''}</p>
                  <button type="button" className="mt-2 rounded border border-rose-500/40 px-2 py-0.5 text-[11px]" onClick={() => removeLeg(leg.id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={toStressTest} className="w-full rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Stress Test ({slip.length})</button>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {BASE_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={nervous.toHref(item.href)} className={`rounded-lg px-2 py-2 text-center text-xs ${active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {showRail ? (
        <button
          type="button"
          onClick={() => setMobileSlipOpen((value) => !value)}
          className="fixed bottom-14 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg sm:hidden"
        >
          Slip ({slip.length})
        </button>
      ) : null}
      {mobileSlipOpen && showRail ? (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-3 rounded-xl border border-white/10 bg-slate-950 p-3 sm:hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Draft Slip</p>
            {slip.length > 0 ? <button type="button" className="text-xs text-slate-400" onClick={clearSlip}>Clear</button> : null}
          </div>
          {slip.length === 0 ? <p className="text-xs text-slate-400">No legs yet.</p> : (
            <ul className="max-h-48 space-y-2 overflow-auto text-xs">
              {slip.map((leg) => <li key={leg.id} className="rounded border border-white/10 p-2">{leg.player} {leg.marketType} {leg.line}</li>)}
            </ul>
          )}
          <button type="button" onClick={toStressTestFromDrawer} className="mt-3 w-full rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">
            Stress Test ({slip.length})
          </button>
        </div>
      ) : null}
      {toast ? <div className="fixed bottom-5 right-5 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900">{toast}</div> : null}
    </div>
  );
}


export function AppShell({ children }: { children: ReactNode }) {
  return <NervousSystemProvider><AppShellInner>{children}</AppShellInner></NervousSystemProvider>;
}
