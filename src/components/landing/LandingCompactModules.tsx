import React from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { PostmortemUploadWedge } from '@/src/components/landing/PostmortemUploadWedge';
import { toHref } from '@/src/core/nervous/routes';
import type { QuerySpine } from '@/src/core/nervous/spine';

type CompactModulesProps = {
  spine: QuerySpine;
};

const trustLine = 'Deterministic demo slate when live feeds are off.';

export function BDAStrip({ spine }: CompactModulesProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="bda-strip">
      <h2 className="text-sm font-semibold">Run your edge before, during, and after lock.</h2>
      <p className="mt-1 text-sm text-slate-300">Move from board scan to stress test to post-slip review in one workflow.</p>
      <p className="mt-1 text-xs text-slate-400">{trustLine}</p>
      <Link href={toHref('/today', spine)} className="mt-3 inline-block rounded-md border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Open today&apos;s board</Link>
    </section>
  );
}

export function Credibility30s({ spine }: CompactModulesProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="credibility-30s">
      <h2 className="text-sm font-semibold">See fragility in under 30 seconds.</h2>
      <p className="mt-1 text-sm text-slate-300">We surface weakest-leg risk, correlation pressure, and confidence context fast.</p>
      <p className="mt-1 text-xs text-slate-400">{trustLine}</p>
      <Link href={toHref('/stress-test', spine)} className="mt-3 inline-block rounded-md border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Stress test a slip</Link>
    </section>
  );
}

export function TrustNote({ spine }: CompactModulesProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="trust-note">
      <h2 className="text-sm font-semibold">No picks. Clear decision context.</h2>
      <p className="mt-1 text-sm text-slate-300">ResearchBets helps you challenge assumptions before stake hits your bankroll.</p>
      <p className="mt-1 text-xs text-slate-400">{trustLine}</p>
      <Link href={appendQuery(toHref('/control', spine), { tab: 'live' })} className="mt-3 inline-block rounded-md border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Open control room</Link>
    </section>
  );
}

export { PostmortemUploadWedge };
