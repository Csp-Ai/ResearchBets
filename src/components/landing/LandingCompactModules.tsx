import React from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { toHref } from '@/src/core/nervous/routes';
import type { QuerySpine } from '@/src/core/nervous/spine';

type CompactModulesProps = {
  spine: QuerySpine;
};

export function BDAStrip({ spine }: CompactModulesProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="bda-strip">
      <h2 className="text-sm font-semibold">Before · During · After</h2>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <Link href={toHref('/today', spine)} className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">Before: Browse props</Link>
        <Link href={toHref('/stress-test', spine)} className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">During: Stress test</Link>
        <Link href={appendQuery(toHref('/control', spine), { tab: 'live' })} className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">After: Control room</Link>
      </div>
    </section>
  );
}

export function Credibility30s() {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="credibility-30s">
      <h2 className="text-sm font-semibold">What you see in 30 seconds</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-300">
        <li>• Weakest leg surfaced first</li>
        <li>• Correlation watch across your legs</li>
        <li>• Injury flags folded into risk context</li>
        <li>• Line movement snapshots when available</li>
      </ul>
    </section>
  );
}

export function TrustNote() {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="trust-note">
      <p className="text-sm font-semibold">No picks. Just context.</p>
      <p className="mt-1 text-xs text-slate-400">ResearchBets is for analysis support only. Bet responsibly and within your limits.</p>
    </section>
  );
}
