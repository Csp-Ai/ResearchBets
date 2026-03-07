import React from 'react';

type WhyThisStandsOutProps = {
  support?: string;
  watchOut?: string;
  fragility?: string;
  compact?: boolean;
  title?: string;
};

export function WhyThisStandsOut({ support, watchOut, fragility, compact = false, title = 'Why this stands out' }: WhyThisStandsOutProps) {
  const supportLine = support ?? 'Support still thin — verify line value before locking.';
  const watchOutLine = watchOut ?? 'No explicit watch-out tagged; still monitor pregame news.';

  return (
    <section className={`rounded-md border border-white/10 bg-black/20 ${compact ? 'p-2' : 'p-2.5'}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100">{title}</p>
        {fragility ? <span className="text-[10px] text-slate-400">{fragility}</span> : null}
      </div>
      <div className={`grid gap-1 ${compact ? '' : 'sm:grid-cols-2 sm:gap-2'}`}>
        <p className="text-[11px] text-emerald-100"><span className="font-semibold text-emerald-200">Support:</span> {supportLine}</p>
        <p className="text-[11px] text-amber-100"><span className="font-semibold text-amber-200">Watch-out:</span> {watchOutLine}</p>
      </div>
    </section>
  );
}
