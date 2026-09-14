'use client';

import { useEffect, useMemo, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import {
  buildConstructionReport,
  type ConstructionLeg,
  type ConstructionStatus,
} from '@/src/core/slips/constructionIntelligence';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

const statusTone: Record<ConstructionStatus, string> = {
  balanced: 'border-emerald-300/[0.16] bg-emerald-300/[0.04] text-emerald-100',
  watch: 'border-amber-300/[0.16] bg-amber-300/[0.04] text-amber-100',
  overloaded: 'border-rose-300/[0.18] bg-rose-300/[0.05] text-rose-100',
};

const tierTone = (tier: ConstructionLeg['tier']) => {
  if (tier === 'floor') return 'border-emerald-300/[0.14] bg-emerald-300/[0.035] text-emerald-100';
  if (tier === 'pushed') return 'border-amber-300/[0.16] bg-amber-300/[0.045] text-amber-100';
  return 'border-cyan-300/[0.12] bg-cyan-300/[0.03] text-cyan-100';
};

const percentage = (value: number | null) =>
  value === null ? null : `${Math.round(value * 100)}%`;

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : String(odds));

type LiveIdea = {
  id: string;
  marketImpliedProb: number;
  consensusPrice: number;
  stepDown?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    sourceCount: number;
  };
};

type IdeasResponse = {
  ok?: boolean;
  data?: { ideas?: LiveIdea[] };
};

export function ConstructionIntelligencePanel() {
  const nervous = useNervousSystem();
  const { slip, removeLeg, isHydrated } = useDraftSlip();
  const [liveIdeas, setLiveIdeas] = useState<Record<string, LiveIdea>>({});

  useEffect(() => {
    if (!isHydrated || slip.length === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ sport: 'NFL', date: nervous.date, tz: nervous.tz });

    fetch(`/api/ideas/today?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as IdeasResponse;
        const rows = payload.ok ? payload.data?.ideas ?? [] : [];
        setLiveIdeas(Object.fromEntries(rows.map((idea) => [idea.id, idea])));
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setLiveIdeas({});
      });

    return () => controller.abort();
  }, [isHydrated, nervous.date, nervous.tz, slip.length]);

  const enrichedSlip = useMemo(
    () => slip.map((leg) => {
      const idea = liveIdeas[leg.id];
      if (!idea) return leg;
      return {
        ...leg,
        marketImpliedProb: idea.marketImpliedProb,
        consensusPrice: formatOdds(idea.consensusPrice),
        adjacentAlt: idea.stepDown
          ? {
              line: idea.stepDown.line,
              bestPrice: formatOdds(idea.stepDown.bestPrice),
              consensusPrice: formatOdds(idea.stepDown.consensusPrice),
              marketImpliedProb: idea.stepDown.marketImpliedProb,
              sourceCount: idea.stepDown.sourceCount,
            }
          : undefined,
      };
    }),
    [liveIdeas, slip],
  );

  const report = useMemo(() => buildConstructionReport(enrichedSlip), [enrichedSlip]);

  if (!isHydrated || slip.length === 0) return null;

  const firstRepair = report.repairCandidates[0];
  const firstTax = firstRepair?.thresholdTax;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(9,14,22,.96),rgba(4,7,12,.99))] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-amber-300/[0.05] blur-[110px]" />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-amber-100/55">
              Construction Intelligence · maximize the ticket, not every leg
            </div>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.045em] text-slate-100 sm:text-[32px]">
              {report.headline}
            </h2>
            <p className="mt-2 max-w-3xl text-[11px] leading-5 text-slate-500">
              {report.summary}
            </p>
          </div>

          <div className={`rounded-2xl border px-4 py-3 ${statusTone[report.status]}`}>
            <div className="text-[8px] uppercase tracking-[0.15em] opacity-60">Push budget</div>
            <div className="mt-1 text-[24px] font-semibold tracking-[-0.05em]">
              {report.pushedCount} / {report.pushBudget}
            </div>
            <div className="mt-0.5 text-[9px] capitalize opacity-60">{report.status}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-emerald-300/[0.10] bg-emerald-300/[0.025] p-3">
            <div className="text-[8px] uppercase tracking-[0.14em] text-emerald-100/50">Floor legs</div>
            <div className="mt-1 text-[22px] font-semibold text-emerald-100">{report.counts.floor}</div>
          </div>
          <div className="rounded-2xl border border-cyan-300/[0.10] bg-cyan-300/[0.025] p-3">
            <div className="text-[8px] uppercase tracking-[0.14em] text-cyan-100/50">Core legs</div>
            <div className="mt-1 text-[22px] font-semibold text-cyan-100">{report.counts.core}</div>
          </div>
          <div className="rounded-2xl border border-amber-300/[0.10] bg-amber-300/[0.025] p-3">
            <div className="text-[8px] uppercase tracking-[0.14em] text-amber-100/50">Pushed legs</div>
            <div className="mt-1 text-[22px] font-semibold text-amber-100">{report.counts.pushed}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">Ticket shape</div>
              <div className="text-[8px] text-slate-700">Sportsbook price + market structure</div>
            </div>
            <div className="mt-3 space-y-2">
              {report.legs.map((leg) => (
                <div key={leg.legId} className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">{leg.player}</div>
                      <div className="mt-0.5 text-[9px] text-slate-600">{leg.marketType.replace(/_/g, ' ')} · {leg.line}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {leg.shortWindow ? (
                        <span className="rounded-full border border-rose-300/[0.14] bg-rose-300/[0.035] px-2 py-1 text-[8px] uppercase tracking-[0.11em] text-rose-100/70">
                          time-window tax
                        </span>
                      ) : null}
                      <span className={`rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.11em] ${tierTone(leg.tier)}`}>
                        {leg.tier}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500">
                    <span>{leg.reason}</span>
                    {percentage(leg.impliedProbability) ? (
                      <span className="text-slate-600">Price-implied {percentage(leg.impliedProbability)}</span>
                    ) : null}
                  </div>
                  {leg.thresholdTax ? (
                    <div className="mt-2 rounded-lg border border-emerald-300/[0.09] bg-emerald-300/[0.025] px-2.5 py-2 text-[9px] text-emerald-100/70">
                      Step down {leg.thresholdTax.lineReduction} → {leg.thresholdTax.lowerLine}: +{Math.round(leg.thresholdTax.probabilityGain * 100)} pts sportsbook-implied probability · {leg.thresholdTax.currentConsensusPrice ?? 'current'} → {leg.thresholdTax.lowerConsensusPrice}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className={`rounded-2xl border p-4 ${statusTone[report.status]}`}>
              <div className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-60">Construction read</div>
              <div className="mt-2 text-[15px] font-semibold">{report.headline}</div>
              <p className="mt-1 text-[10px] leading-5 opacity-70">{report.summary}</p>
            </div>

            {firstRepair ? (
              <div className="rounded-2xl border border-amber-300/[0.12] bg-amber-300/[0.03] p-4">
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-100/55">First repair candidate</div>
                <div className="mt-2 text-[14px] font-semibold text-slate-100">{firstRepair.player}</div>
                <div className="mt-1 text-[10px] text-slate-500">{firstRepair.marketType.replace(/_/g, ' ')} · {firstRepair.line}</div>
                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  {firstRepair.suggestedTarget
                    ? `Keep the read, but consider ${firstRepair.suggestedTarget}.`
                    : 'Keep the read, but reduce the ask before adding more payout pressure.'}
                </p>
                {firstTax ? (
                  <div className="mt-3 rounded-xl border border-emerald-300/[0.11] bg-emerald-300/[0.025] p-3">
                    <div className="text-[8px] font-semibold uppercase tracking-[0.13em] text-emerald-100/55">Priced Threshold Tax</div>
                    <div className="mt-1 text-[12px] font-semibold text-emerald-50">
                      Lower {firstTax.lineReduction} · gain +{Math.round(firstTax.probabilityGain * 100)} pts market-implied
                    </div>
                    <p className="mt-1 text-[9px] leading-4 text-slate-500">
                      Consensus price {firstTax.currentConsensusPrice ?? '—'} → {firstTax.lowerConsensusPrice}. This is sportsbook-price implied probability, not a ResearchBets win prediction.
                    </p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeLeg(firstRepair.legId)}
                  className="mt-3 rounded-xl border border-amber-300/[0.14] bg-amber-300/[0.04] px-3 py-2.5 text-[10px] font-semibold text-amber-100/80"
                >
                  Trim this pushed leg
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-300/[0.10] bg-emerald-300/[0.025] p-4">
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-emerald-100/55">No repair needed</div>
                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  No pushed leg is currently asking for a structural repair.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">Threshold Tax</div>
                <div className="text-[8px] text-slate-700">{report.pricedThresholdTaxCount} priced</div>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-slate-500">
                {report.pricedThresholdTaxCount > 0
                  ? 'Priced comparisons use the nearest lower alternate tier currently returned by the live market scanner. The probability delta is sportsbook-price implied, not model confidence.'
                  : 'ResearchBets will not invent a payout-vs-survival estimate. A true Threshold Tax needs the adjacent alternate tier and its live price; otherwise this panel shows structural pressure only.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
