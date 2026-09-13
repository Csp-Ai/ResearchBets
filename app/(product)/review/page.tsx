'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { EdgeProfileCard } from '@/src/components/review/EdgeProfileCard';
import { PostmortemList } from '@/src/components/review/PostmortemList';
import { TicketAutopsyHero } from '@/src/components/review/TicketAutopsyHero';
import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getEdgeProfile, listPostmortems } from '@/src/core/review/store';

export default function ReviewPage() {
  const nervous = useNervousSystem();
  const searchParams = useSearchParams();
  const activeTraceId = searchParams?.get('trace_id') ?? nervous.trace_id;
  const activeSlipId = searchParams?.get('slip_id') ?? nervous.slip_id;
  const records = useMemo(() => {
    const all = listPostmortems();
    return [...all].sort((a, b) => {
      const aMatch =
        (activeTraceId ? a.trace_id === activeTraceId : false) ||
        (activeSlipId ? a.slip_id === activeSlipId : false);
      const bMatch =
        (activeTraceId ? b.trace_id === activeTraceId : false) ||
        (activeSlipId ? b.slip_id === activeSlipId : false);
      if (aMatch === bMatch) return Date.parse(b.settledAt) - Date.parse(a.settledAt);
      return aMatch ? -1 : 1;
    });
  }, [activeSlipId, activeTraceId]);
  const profile = useMemo(() => getEdgeProfile(), []);
  const activeRecord = records[0];

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20" data-testid="review-page">
      {activeRecord ? <TicketAutopsyHero record={activeRecord} /> : null}
      {records.length === 0 ? (
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(9,15,24,.92),rgba(4,7,12,.96))] p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-300/[0.05] blur-[100px]" />
          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100/50">Ticket Autopsy</div>
            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.05em]">Nothing to dissect yet.</h1>
            <p className="mt-2 max-w-xl text-[12px] leading-5 text-slate-500">Settle a tracked ticket and ResearchBets will identify the break point, compare it with earlier X-Ray/Pulse pressure, save the lesson to Bettor Memory, and offer a next-time guardrail.</p>
            <Link
              href={appendQuery(nervous.toHref('/track'), {})}
              className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015]"
            >
              Open Ticket Pulse
            </Link>
          </div>
        </section>
      ) : null}
      <EdgeProfileCard profile={profile} />
      <PostmortemList records={records} />
    </section>
  );
}
