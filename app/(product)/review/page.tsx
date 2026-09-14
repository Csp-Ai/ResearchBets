'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { EdgeProfileCard } from '@/src/components/review/EdgeProfileCard';
import { PostmortemList } from '@/src/components/review/PostmortemList';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getEdgeProfile, listPersistedPostmortems, listPostmortems } from '@/src/core/review/store';

const cleanTag = (value?: string) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'No repeat leak yet';

export default function ReviewPage() {
  const nervous = useNervousSystem();
  const searchParams = useSearchParams();
  const activeTraceId = searchParams?.get('trace_id') ?? nervous.trace_id;
  const activeSlipId = searchParams?.get('slip_id') ?? nervous.slip_id;
  const records = useMemo(() => {
    const all = nervous.mode === 'demo' ? listPostmortems() : listPersistedPostmortems();
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
  }, [activeSlipId, activeTraceId, nervous.mode]);
  const profile = useMemo(() => getEdgeProfile(), []);

  const latest = records[0];
  const settledIdentity = latest?.weakest_leg_identity ?? latest?.lifecycle_lineage?.settled;
  const attributedBreaker = settledIdentity?.canonical_leg_id
    ? latest?.legs.find((leg) => leg.legId === settledIdentity.canonical_leg_id)
    : undefined;
  const closestMissFallback = latest?.legs
    .filter((leg) => !leg.hit)
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  const latestMiss = attributedBreaker && !attributedBreaker.hit
    ? attributedBreaker
    : closestMissFallback;
  const breakerBasis = attributedBreaker && !attributedBreaker.hit
    ? 'Settled attribution'
    : latestMiss
      ? 'Closest-miss fallback'
      : null;
  const reviewedLegs = records.reduce((sum, record) => sum + record.legs.length, 0);
  const hitLegs = records.reduce((sum, record) => sum + record.legs.filter((leg) => leg.hit).length, 0);
  const legHitRate = reviewedLegs > 0 ? Math.round((hitLegs / reviewedLegs) * 100) : 0;
  const latestHitCount = latest?.legs.filter((leg) => leg.hit).length ?? 0;
  const lifecycleStages = latest
    ? [
        { label: 'X-Ray', identity: latest.lifecycle_lineage?.pregame },
        { label: 'Pulse', identity: latest.lifecycle_lineage?.live },
        { label: 'Autopsy', identity: settledIdentity },
      ]
    : [];
  const hasLifecycleLineage = lifecycleStages.some((stage) => stage.identity?.canonical_leg_id);
  const legLabelFor = (legId?: string | null) => {
    if (!legId) return 'No leg recorded';
    return latest?.legs.find((leg) => leg.legId === legId)?.player ?? legId;
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03060a] text-white" data-testid="review-page">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-violet-500/[0.06] blur-[160px]" />
        <div className="absolute -right-32 top-[28rem] h-[26rem] w-[26rem] rounded-full bg-rose-400/[0.045] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between">
          <Link href={nervous.toHref('/')} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-violet-100/[0.12] bg-white/[0.035] text-[13px] font-black">R</div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.03em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Ticket Autopsy</div>
            </div>
          </Link>
          <div className="rounded-full border border-violet-300/[0.12] bg-violet-300/[0.035] px-3 py-2 text-[10px] text-violet-100/65">
            {records.length} reviewed ticket{records.length === 1 ? '' : 's'}
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(13,10,24,.94),rgba(4,7,12,.98))] px-5 py-6 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/[0.24] to-transparent" />
          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-100/55">After · Ticket Autopsy</div>
              <h1 className="mt-3 max-w-3xl text-[40px] font-semibold leading-[0.95] tracking-[-0.06em] sm:text-[60px]">
                Don&apos;t just log the loss.
                <span className="block bg-gradient-to-r from-white via-violet-100 to-slate-400 bg-clip-text text-transparent">Learn how the ticket broke.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-[13px] leading-6 text-slate-500 sm:text-[14px]">
                Settlement becomes memory: breaker legs, miss distance, fragility, repeated failure modes, and a next-time guardrail that can follow you into the next X-Ray.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Tickets</div>
                <div className="mt-1 text-[22px] font-semibold">{records.length}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Leg hit rate</div>
                <div className="mt-1 text-[22px] font-semibold">{reviewedLegs ? `${legHitRate}%` : '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Latest</div>
                <div className="mt-1 text-[13px] font-semibold uppercase">{latest?.status ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-slate-600">
            <Link href={nervous.toHref('/')} className="rounded-full border border-cyan-300/[0.10] bg-cyan-300/[0.025] px-3 py-2 text-cyan-100/55">Discover</Link>
            <span>→</span>
            <Link href={nervous.toHref('/stress-test')} className="rounded-full border border-amber-300/[0.10] bg-amber-300/[0.025] px-3 py-2 text-amber-100/55">X-Ray</Link>
            <span>→</span>
            <Link href={nervous.toHref('/pulse')} className="rounded-full border border-emerald-300/[0.10] bg-emerald-300/[0.025] px-3 py-2 text-emerald-100/55">Pulse</Link>
            <span>→</span>
            <span className="rounded-full border border-violet-300/[0.18] bg-violet-300/[0.055] px-3 py-2 text-violet-100/80">Autopsy</span>
            <span>→</span>
            <span className="rounded-full border border-fuchsia-300/[0.10] bg-fuchsia-300/[0.025] px-3 py-2 text-fuchsia-100/55">Memory</span>
          </div>
        </section>

        {latest ? (
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
            <article className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(255,255,255,.04),rgba(255,255,255,.015))] p-5 sm:p-6">
              <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-600">Latest autopsy</div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${latest.status === 'won' ? 'text-emerald-200' : latest.status === 'lost' ? 'text-rose-200' : 'text-slate-300'}`}>
                    {latest.status}
                  </div>
                  <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.045em]">
                    {latest.status === 'won'
                      ? `${latestHitCount}/${latest.legs.length} legs held.`
                      : `${latestHitCount}/${latest.legs.length} reads survived.`}
                  </h2>
                </div>
                <div className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2 text-[10px] text-slate-500">
                  Fragility {latest.fragility.score}
                </div>
              </div>

              {latestMiss ? (
                <div className="mt-5 rounded-[22px] border border-rose-300/[0.13] bg-rose-300/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-rose-100/50">Breaker leg</div>
                    {breakerBasis ? (
                      <div className="rounded-full border border-rose-200/[0.10] bg-black/20 px-2 py-1 text-[8px] uppercase tracking-[0.11em] text-rose-100/45">{breakerBasis}</div>
                    ) : null}
                  </div>
                  <div className="mt-2 text-[18px] font-semibold text-slate-100">{latestMiss.player}</div>
                  <div className="mt-1 text-[12px] text-slate-400">
                    {cleanTag(latestMiss.statType)} · {latestMiss.finalValue} / {latestMiss.target} · missed by {Math.abs(latestMiss.delta).toFixed(1)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(latestMiss.missTags.length ? latestMiss.missTags : ['unclassified']).map((tag) => (
                      <span key={tag} className="rounded-full border border-rose-300/[0.10] bg-black/20 px-2.5 py-1.5 text-[9px] text-rose-100/65">{cleanTag(tag)}</span>
                    ))}
                  </div>
                  {latestMiss.missNarrative ? <p className="mt-3 text-[11px] leading-5 text-slate-500">{latestMiss.missNarrative}</p> : null}
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-emerald-300/[0.12] bg-emerald-300/[0.035] p-4 text-[12px] text-emerald-100/70">
                  No breaking leg on this ticket. Preserve the process notes that held through settlement.
                </div>
              )}
            </article>

            <article className="rounded-[28px] border border-violet-300/[0.10] bg-violet-300/[0.025] p-5 sm:p-6">
              <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-violet-100/45">Lesson saved forward</div>
              <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em]">Memory should change the next build.</h2>
              <p className="mt-3 text-[12px] leading-6 text-slate-500">
                {latest.nextTimeRule?.body ?? latest.narrative[0] ?? 'As reviewed outcomes accumulate, ResearchBets turns repeated pressure points into pre-submit warnings.'}
              </p>

              {hasLifecycleLineage ? (
                <div className="mt-4 rounded-2xl border border-violet-200/[0.10] bg-black/20 p-4">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-violet-100/45">Weakest-leg continuity</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {lifecycleStages.map((stage, index) => (
                      <div key={stage.label} className="relative rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">
                        <div className="text-[8px] font-semibold uppercase tracking-[0.13em] text-slate-600">{stage.label}</div>
                        <div className="mt-1 truncate text-[11px] font-semibold text-slate-200">{legLabelFor(stage.identity?.canonical_leg_id)}</div>
                        <div className="mt-1 text-[8px] capitalize text-slate-600">
                          {stage.identity ? `${stage.identity.stage_role.replace(/_/g, ' ')} · ${stage.identity.continuity_status.replace(/_/g, ' ')}` : 'not recorded'}
                        </div>
                        {index < lifecycleStages.length - 1 ? <div className="absolute -right-2 top-1/2 hidden text-[10px] text-violet-200/30 sm:block">→</div> : null}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[9px] leading-4 text-slate-600">
                    This shows whether the pressure point ResearchBets saw before lock carried into live tracking and settlement. Missing stages stay explicitly unrecorded.
                  </p>
                </div>
              ) : null}

              {latest.nextTimeRule ? (
                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Next-time guardrail</div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-200">{latest.nextTimeRule.title}</div>
                </div>
              ) : null}
              <Link href={nervous.toHref('/stress-test')} className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015]">
                Use memory on next X-Ray →
              </Link>
            </article>
          </section>
        ) : (
          <section className="mt-6 rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-600">Memory starts here</div>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.045em]">No settled ticket to dissect yet.</h2>
            <p className="mt-2 max-w-xl text-[12px] leading-6 text-slate-500">
              Track a real ticket through Pulse, settle it, and ResearchBets will preserve what broke—or what held—as evidence for future builds.
            </p>
            <Link href={nervous.toHref('/pulse')} className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015]">Open Ticket Pulse →</Link>
          </section>
        )}

        <div className="mt-6 space-y-5">
          <EdgeProfileCard profile={profile} />
          <PostmortemList records={records} />
        </div>
      </div>
    </main>
  );
}
