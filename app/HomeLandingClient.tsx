'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { DuringStageTracker } from '@/src/components/track/DuringStageTracker';
import { getLatestTraceId } from '@/src/core/run/store';
import { toHref } from '@/src/core/nervous/routes';
import type { QuerySpine } from '@/src/core/nervous/spine';

export default function HomeLandingClient({ spine }: { spine: QuerySpine }) {
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);

  useEffect(() => {
    setLatestTraceId(getLatestTraceId());
  }, []);

  const traceId = useMemo(() => spine.trace_id || latestTraceId || undefined, [spine.trace_id, latestTraceId]);

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]" data-testid="landing-compact-tracker">
      <DuringStageTracker trace_id={traceId} mode={spine.mode} compact />
      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
        <p className="text-sm font-semibold text-slate-100">Slip continuity</p>
        <p className="mt-1 text-xs text-slate-300">Keep your draft in motion from board → slip → analyze without losing context.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href={appendQuery(toHref('/slip', spine), { sample: '1' })} className="rounded border border-cyan-300/50 px-2 py-1 text-cyan-100">Open QuickSlip</Link>
          <Link href={toHref('/track', spine)} className="rounded border border-white/20 px-2 py-1 text-slate-200">Track latest run</Link>
        </div>
      </div>
    </section>
  );
}
