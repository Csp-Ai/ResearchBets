'use client';

import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

type Props = {
  modeLabel: string;
  modeTooltip: string;
};

export function Topbar({ modeLabel, modeTooltip }: Props) {
  const nervous = useNervousSystem();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">RESEARCH<span className="text-cyan-300">BETS</span></div>
        <Link href={appendQuery(nervous.toHref('/today'), { tab: 'board' })} className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">Boards</Link>
        <select aria-label="Timezone" className="min-h-11 rounded-md border border-white/15 bg-slate-900 px-2 text-xs text-slate-100">
          <option>ET</option><option>CT</option><option>MT</option><option>PT</option>
        </select>
        <span className="group relative ml-auto rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-200" title={modeTooltip}>
          {modeLabel}
          <span className="pointer-events-none absolute right-0 top-7 hidden w-44 rounded border border-white/20 bg-slate-900 p-2 text-[10px] text-slate-300 group-hover:block">{modeTooltip}</span>
        </span>
        <button aria-label="Open account menu" className="min-h-11 rounded-md border border-white/20 px-3 text-xs text-slate-100">Acct ▾</button>
        <button aria-label="Open drawer menu" className="min-h-11 rounded-md border border-white/20 px-3 text-xs text-slate-100">☰</button>
      </div>
    </header>
  );
}
