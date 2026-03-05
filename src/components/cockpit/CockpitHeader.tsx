'use client';

import type { ReactNode } from 'react';

import { LiveNervousSystemStrip, type LiveNervousSystemStripProps } from '@/src/components/nervous/LiveNervousSystemStrip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

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

  return (
    <header className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
            <p className="text-sm text-slate-300">{purpose}</p>
          </div>
          {ctas ? <div className="flex flex-wrap gap-2">{ctas}</div> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/15 px-2 py-1">{nervous.sport}</span>
          <span className="rounded-full border border-white/15 px-2 py-1">{nervous.date}</span>
          <span className="rounded-full border border-white/15 px-2 py-1">{nervous.tz}</span>
          <span className="rounded-full border border-white/15 px-2 py-1">{strip.mode}</span>
          <span>{strip.updatedAt ? `Updated ${new Date(strip.updatedAt).toLocaleTimeString()}` : 'Updated recently'}</span>
        </div>
      </div>
      <LiveNervousSystemStrip {...strip} />
    </header>
  );
}
