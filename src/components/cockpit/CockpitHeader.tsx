'use client';

import type { ReactNode } from 'react';

import { LiveNervousSystemStrip, type LiveNervousSystemStripProps } from '@/src/components/nervous/LiveNervousSystemStrip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getTruthModeCopy } from '@/src/core/ui/truthPresentation';

export function CockpitHeader({
  title,
  purpose,
  ctas,
  strip,
}: {
  title: string;
  purpose: string;
  ctas?: ReactNode;
  strip: LiveNervousSystemStripProps;
}) {
  const nervous = useNervousSystem();
  const modeCopy = getTruthModeCopy({ mode: strip.mode, reason: strip.reason, intentMode: strip.intentMode });

  return (
    <header className="space-y-2">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{title}</p>
            <p className="text-sm text-slate-300">{purpose}</p>
          </div>
          {ctas ? <div className="flex flex-wrap gap-2">{ctas}</div> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/15 px-2 py-1">{nervous.sport}</span>
          <span className="rounded-full border border-white/15 px-2 py-1">{nervous.date}</span>
          <span className="rounded-full border border-white/15 px-2 py-1">{nervous.tz}</span>
          <span className="rounded-full border border-white/15 px-2 py-1" title={modeCopy.detail}>{modeCopy.label}</span>
        </div>
      </div>
      <LiveNervousSystemStrip {...strip} />
    </header>
  );
}
