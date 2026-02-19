import React from 'react';
import Link from 'next/link';

import { asMarketType, type MarketType } from '../../src/core/markets/marketType';
import {
  getParlayCorrelationScore,
  getParlayStyle,
  suggestAltLeg,
  summarizeParlayRisk,
  type ParlayCorrelationLeg
} from '../../src/core/parlay/parlayRisk';
import { buildPropLegInsight, type PropLegInsight } from '../../src/core/slips/propInsights';

import type { LegHitProfile } from '../../src/core/evidence/evidenceSchema';
import type { ExtractedLeg } from '../../src/core/slips/extract';

type SnapshotReplayLeg = ExtractedLeg & {
  team?: string;
  gameId?: string;
  trendSeries?: number[];
  injuryImpact?: string;
  defenseRank?: number;
};

export interface SnapshotReplayViewProps {
  legs: SnapshotReplayLeg[];
  legInsights?: PropLegInsight[];
  legHitProfiles?: LegHitProfile[];
  snapshotId?: string;
  traceId?: string;
  replayEnabled?: boolean;
}

const confidenceClassByRisk: Record<PropLegInsight['riskTag'], string> = {
  Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  High: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
};

const MARKET_TYPE_TAGS: Record<MarketType, string> = {
  spread: 'SPR',
  total: 'TOT',
  moneyline: 'ML',
  points: 'PTS',
  threes: '3PM',
  rebounds: 'REB',
  assists: 'AST',
  ra: 'R+A',
  pra: 'PRA'
};

const getInsight = (leg: SnapshotReplayLeg, insight?: PropLegInsight): PropLegInsight => {
  if (insight) return insight;
  return buildPropLegInsight({ ...leg, market: asMarketType(leg.market, 'points') });
};

export function SnapshotReplayView({
  legs,
  legInsights = [],
  legHitProfiles = [],
  snapshotId,
  traceId,
  replayEnabled = false
}: SnapshotReplayViewProps) {
  const normalizedLegs: Array<{ leg: SnapshotReplayLeg; insight: PropLegInsight; live?: LegHitProfile }> =
    legs.map((leg, index) => ({
      leg,
      insight: getInsight(leg, legInsights[index]),
      live: legHitProfiles[index]
    }));

  const weakestLeg =
    normalizedLegs
      .map((entry, idx) => ({ idx, score: entry.live?.verdict.score ?? 101 }))
      .sort((a, b) => a.score - b.score)[0]?.idx ?? -1;

  const parlayLegs: ParlayCorrelationLeg[] = normalizedLegs.map(({ leg }) => ({ ...leg }));
  const parlayRiskSummary = summarizeParlayRisk(parlayLegs);
  const parlayCorrelation = getParlayCorrelationScore(parlayLegs);
  const parlayStyle = getParlayStyle(parlayCorrelation.score);
  const altLegSuggestion = suggestAltLeg(parlayLegs);

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <header className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        <h2 className="text-lg font-semibold text-slate-100">Snapshot Replay</h2>
        <p className="text-sm text-slate-400">
          {parlayRiskSummary} · Correlation strength: {parlayCorrelation.strength} ({parlayCorrelation.score})
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">
            Parlay style: {parlayStyle}
          </span>
        </div>
      </header>

      {altLegSuggestion ? (
        <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-medium">Alt-leg suggestion</p>
          <p className="mt-1 text-amber-200">
            Leg {altLegSuggestion.legIndex + 1}: {altLegSuggestion.suggestionLabel}
          </p>
        </section>
      ) : null}

      <div className="space-y-3">
        {normalizedLegs.map(({ leg, insight, live }, index) => {
          const divergence = live?.lineContext.divergence;
          return (
            <article
              key={`${leg.selection}-${index}`}
              className={`rounded-lg border bg-slate-950/70 p-4 ${weakestLeg === index ? 'border-rose-500/60' : 'border-slate-800'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{leg.selection}</h3>
                  <p className="text-xs text-slate-400">
                    {insight.marketLabel}{' '}
                    <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-semibold text-slate-200">
                      {MARKET_TYPE_TAGS[insight.marketType] ?? insight.marketType.toUpperCase()}
                    </span>
                    {weakestLeg === index ? ' · Weakest leg' : ''}
                  </p>
                </div>
                <span className={`rounded border px-2 py-1 text-xs font-medium ${confidenceClassByRisk[insight.riskTag]}`}>
                  {live?.verdict.label ?? insight.riskTag}
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-800 bg-slate-900/30 p-2 text-xs text-slate-300">
                  <p className="font-medium text-slate-100">Hit Profile</p>
                  <p>L5 hit rate: {live?.hitRate.l5 ?? insight.hitRateLast5}%</p>
                  <p>L10 hit rate: {live?.hitRate.l10 ?? '—'}%</p>
                  <p>Season baseline: {live?.hitRate.seasonAvg ?? '—'}</p>
                  <p>Vs-opponent: {live?.hitRate.vsOpponent ?? 'N/A'}</p>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/30 p-2 text-xs text-slate-300">
                  <p className="font-medium text-slate-100">Line Context</p>
                  <p>
                    Best vs worst line: {divergence?.bestLine?.line ?? '—'} / {divergence?.worstLine?.line ?? '—'}
                  </p>
                  <p>Consensus line: {live?.lineContext.consensusLine ?? '—'}</p>
                  <p>Divergence spread: {divergence?.spread ?? 0}</p>
                  {divergence?.warning ? (
                    <p className="mt-1 inline-block rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                      Divergence warning
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                <p>
                  As of: {live?.provenance.asOf ? new Date(live.provenance.asOf).toLocaleString() : 'N/A'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(live?.provenance.sources ?? []).slice(0, 5).map((source, sourceIndex) => (
                    <span key={`${source.provider}-${sourceIndex}`} className="rounded border border-slate-700 px-1.5 py-0.5">
                      {source.provider}
                    </span>
                  ))}
                </div>
                {live?.fallbackReason ? (
                  <p className="text-amber-300">Fallback: {live.fallbackReason}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {replayEnabled && traceId ? (
        <footer>
          <Link
            href={`/research?trace_id=${traceId}&snapshotId=${encodeURIComponent(snapshotId ?? traceId)}&replay=1`}
            className="text-xs text-cyan-300 underline"
          >
            Open replay graph for trace {traceId}
          </Link>
        </footer>
      ) : null}
    </section>
  );
}

export default SnapshotReplayView;
