'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { EdgeProfileCard } from '@/src/components/review/EdgeProfileCard';
import { PostmortemList } from '@/src/components/review/PostmortemList';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { matchesLifecycleIdentity } from '@/src/core/lineage/lineage';
import { getEdgeProfile, listPersistedPostmortems, listPostmortems } from '@/src/core/review/store';

const cleanTag = (value?: string) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Unclassified';

export default function ReviewPage() {
  const nervous = useNervousSystem();
  const searchParams = useSearchParams();
  const activeTraceId = searchParams?.get('trace_id') ?? nervous.trace_id;
  const activeSlipId = searchParams?.get('slip_id') ?? nervous.slip_id;
  const activeTicketId =
    searchParams?.get('ticketId') ?? searchParams?.get('ticket_id') ?? nervous.ticketId;

  const records = useMemo(() => {
    const all = nervous.mode === 'demo' ? listPostmortems() : listPersistedPostmortems();
    return all
      .filter((record) =>
        matchesLifecycleIdentity(record, {
          ticketId: activeTicketId,
          slip_id: activeSlipId,
          trace_id: activeTraceId
        })
      )
      .sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt));
  }, [activeTicketId, activeSlipId, activeTraceId, nervous.mode]);

  const profile = useMemo(() => getEdgeProfile(), []);
  const latest = records[0];
  const settledIdentity = latest?.weakest_leg_identity ?? latest?.lifecycle_lineage?.settled;
  const pregameIdentity = latest?.lifecycle_lineage?.pregame;
  const liveIdentity = latest?.lifecycle_lineage?.live;

  const attributedBreaker = settledIdentity?.canonical_leg_id
    ? latest?.legs.find((leg) => leg.legId === settledIdentity.canonical_leg_id)
    : undefined;
  const closestMiss = latest?.legs
    .filter((leg) => !leg.hit)
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  const breaker = attributedBreaker && !attributedBreaker.hit ? attributedBreaker : closestMiss;

  const pregameLeg = pregameIdentity?.canonical_leg_id
    ? latest?.legs.find((leg) => leg.legId === pregameIdentity.canonical_leg_id)
    : undefined;
  const liveLeg = liveIdentity?.canonical_leg_id
    ? latest?.legs.find((leg) => leg.legId === liveIdentity.canonical_leg_id)
    : undefined;

  const originalPressureMatched = Boolean(
    pregameIdentity?.canonical_leg_id &&
      settledIdentity?.canonical_leg_id &&
      pregameIdentity.canonical_leg_id === settledIdentity.canonical_leg_id
  );
  const pressureContinuityUnknown = !pregameIdentity?.canonical_leg_id || !settledIdentity?.canonical_leg_id;

  const reviewedLegs = records.reduce((sum, record) => sum + record.legs.length, 0);
  const hitLegs = records.reduce(
    (sum, record) => sum + record.legs.filter((leg) => leg.hit).length,
    0
  );
  const legHitRate = reviewedLegs > 0 ? Math.round((hitLegs / reviewedLegs) * 100) : 0;
  const latestHitCount = latest?.legs.filter((leg) => leg.hit).length ?? 0;

  const continuityLabel = pressureContinuityUnknown
    ? 'Not enough lineage to verify'
    : originalPressureMatched
      ? 'Yes — the original pressure carried through settlement'
      : 'No — a different leg became the breaker';

  const primaryLesson = latest?.nextTimeRule?.body ?? latest?.narrative[0] ?? null;

  return (
    <main className="min-h-screen bg-[#03060a] text-white" data-testid="review-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-7">
        <header className="flex items-center justify-between gap-4">
          <Link href={nervous.toHref('/')} className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-xs font-black">
              R
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[-0.03em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Review + Memory</div>
            </div>
          </Link>
          <div className="text-xs text-slate-500">
            {records.length} reviewed ticket{records.length === 1 ? '' : 's'}
          </div>
        </header>

        <section className="mt-8 border-y border-white/10 py-7 sm:py-9">
          <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-violet-200/70">
            ResearchBets review
          </div>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
            Did the original X-Ray pressure actually matter?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Settlement should resolve the thesis, identify what actually broke the ticket, and save one useful guardrail for the next build.
          </p>
        </section>

        {latest ? (
          <>
            <section className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
              <article className="bg-[#05090f] p-5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Original pressure</div>
                <div className="mt-2 text-lg font-semibold text-slate-100">
                  {pregameLeg?.player ?? 'Not recorded'}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {pregameIdentity ? cleanTag(pregameIdentity.continuity_status) : 'Pregame weakest-leg identity unavailable.'}
                </p>
              </article>

              <article className="bg-[#05090f] p-5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">What actually broke</div>
                <div className={`mt-2 text-lg font-semibold ${breaker ? 'text-rose-100' : 'text-emerald-100'}`}>
                  {breaker?.player ?? (latest.status === 'won' ? 'No breaker leg' : 'Not attributable')}
                </div>
                {breaker ? (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {cleanTag(breaker.statType)} · {breaker.finalValue} / {breaker.target} · missed by {Math.abs(breaker.delta).toFixed(1)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {latest.status === 'won'
                      ? 'The ticket survived settlement without a breaker.'
                      : 'Settlement exists, but the breaker is not verified.'}
                  </p>
                )}
              </article>

              <article className="bg-[#05090f] p-5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Thesis result</div>
                <div className={`mt-2 text-base font-semibold ${originalPressureMatched ? 'text-amber-100' : 'text-slate-100'}`}>
                  {continuityLabel}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {pressureContinuityUnknown
                    ? 'ResearchBets will not invent continuity where the lifecycle identity was not recorded.'
                    : originalPressureMatched
                      ? 'The same structural pressure identified before lock remained the decisive weakness.'
                      : 'The pregame concern did not become the final breaker; the ticket failed somewhere else.'}
                </p>
              </article>
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <article className="border-t border-white/10 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Settlement</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                      {latest.status === 'won'
                        ? `${latestHitCount}/${latest.legs.length} legs held.`
                        : `${latestHitCount}/${latest.legs.length} legs survived.`}
                    </h2>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-500">
                    <span>{latest.status.toUpperCase()}</span>
                    <span>·</span>
                    <span>Fragility {latest.fragility.score}</span>
                  </div>
                </div>

                {breaker?.missNarrative ? (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">{breaker.missNarrative}</p>
                ) : null}

                {breaker?.missTags?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {breaker.missTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">
                        {cleanTag(tag)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {(pregameLeg || liveLeg || settledIdentity?.canonical_leg_id) ? (
                  <details className="mt-5 border-t border-white/8 pt-4">
                    <summary className="cursor-pointer text-xs font-medium text-slate-300">
                      Show weakest-leg continuity
                    </summary>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/8 p-3">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">X-Ray</div>
                        <div className="mt-1 text-sm font-medium">{pregameLeg?.player ?? 'Not recorded'}</div>
                      </div>
                      <div className="rounded-xl border border-white/8 p-3">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Pulse</div>
                        <div className="mt-1 text-sm font-medium">{liveLeg?.player ?? 'Not recorded'}</div>
                      </div>
                      <div className="rounded-xl border border-white/8 p-3">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Review</div>
                        <div className="mt-1 text-sm font-medium">{breaker?.player ?? 'No verified breaker'}</div>
                      </div>
                    </div>
                  </details>
                ) : null}
              </article>

              <article className="border-t border-violet-300/20 pt-5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-violet-200/60">Next-time guardrail</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-100">
                  {latest.nextTimeRule?.title ?? 'Turn this outcome into one better decision.'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {primaryLesson ?? 'This reviewed ticket does not yet contain enough evidence for a durable guardrail.'}
                </p>
                <Link
                  href={nervous.toHref('/stress-test')}
                  className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#071015]"
                >
                  Use this on the next X-Ray →
                </Link>
              </article>
            </section>
          </>
        ) : (
          <section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">No review yet</div>
            <h2 className="mt-2 text-2xl font-semibold">Settle a tracked ticket to close the loop.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              ResearchBets needs a reviewed outcome before it can compare the original X-Ray thesis with what actually happened or save a next-time guardrail.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={nervous.toHref('/pulse')} className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#071015]">
                Open Ticket Pulse
              </Link>
              <Link href={nervous.toHref('/stress-test')} className="rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300">
                Analyze a ticket
              </Link>
            </div>
          </section>
        )}

        <details className="mt-8 border-t border-white/10 pt-5">
          <summary className="cursor-pointer text-xs font-medium text-slate-300">Performance history and deeper memory</summary>
          <div className="mt-5 grid gap-5">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 p-3 text-sm">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Reviewed tickets</div>
                <div className="mt-1 font-semibold">{records.length}</div>
              </div>
              <div className="rounded-xl border border-white/8 p-3 text-sm">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Reviewed legs</div>
                <div className="mt-1 font-semibold">{reviewedLegs}</div>
              </div>
              <div className="rounded-xl border border-white/8 p-3 text-sm">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Leg hit rate</div>
                <div className="mt-1 font-semibold">{reviewedLegs ? `${legHitRate}%` : '—'}</div>
              </div>
            </div>
            <EdgeProfileCard profile={profile} />
            <PostmortemList records={records} />
          </div>
        </details>
      </div>
    </main>
  );
}
