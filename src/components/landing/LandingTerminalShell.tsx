import React from 'react';

import { ModeBadge } from '@/src/components/landing/ModeBadge';
import type { TodayMode } from '@/src/core/today/types';

type LandingTerminalShellProps = {
  mode: TodayMode;
  reason?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export const modeLabel = (mode: TodayMode) => {
  if (mode === 'demo') return 'Demo mode (live feeds off)';
  if (mode === 'cache') return 'Live mode (some feeds unavailable)';
  return 'Live feeds on';
};

export function LandingTerminalShell({
  mode,
  reason,
  title = "Tonight's Board",
  subtitle = 'Scan edges, build a slip, then stress test before lock.',
  children,
  className
}: LandingTerminalShellProps) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 ${className ?? ''}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold tracking-wide text-slate-100">ResearchBets terminal</p>
          <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.65)]" aria-hidden="true" />
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">{modeLabel(mode)}</span>
        </div>
        <ModeBadge mode={mode} reason={reason} />
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
