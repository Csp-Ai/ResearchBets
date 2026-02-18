import React from 'react';
import Link from 'next/link';

import { asMarketType } from '../../src/core/markets/marketType';
import { getParlayCorrelationScore, summarizeParlayRisk, type ParlayCorrelationLeg } from '../../src/core/parlay/parlayRisk';
import { buildPropLegInsight, type PropLegInsight } from '../../src/core/slips/propInsights';

import type { ExtractedLeg } from '../../src/core/slips/extract';

type SnapshotReplayLeg = ExtractedLeg & {
  team?: string;
  gameId?: string;
  trendSeries?: number[];
  injuryImpact?: string;
};

export interface SnapshotReplayViewProps {
  legs: SnapshotReplayLeg[];
  legInsights?: PropLegInsight[];
  snapshotId?: string;
  traceId?: string;
  replayEnabled?: boolean;
}

const confidenceClassByRisk: Record<PropLegInsight['riskTag'], string> = {
  Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  High: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const barClass = (value: number) => {
  if (value >= 70) return 'bg-emerald-400';
  if (value >= 50) return 'bg-amber-400';
  return 'bg-rose-400';
};

const trendSeriesForLeg = (insight: PropLegInsight, leg: SnapshotReplayLeg): number[] => {
  if (leg.trendSeries?.length) {
    return leg.trendSeries.slice(0, 5);
  }

  const seed = insight.hitRateLast5;
  return [
    Math.max(seed - 12, 20),
    Math.max(seed - 5, 25),
    seed,
    Math.min(seed + 4, 95),
    Math.min(seed + (insight.riskTag === 'High' ? -3 : 6), 95),
  ];
};

const getInsight = (leg: SnapshotReplayLeg, insight?: PropLegInsight): PropLegInsight => {
  if (insight) return insight;
  return buildPropLegInsight({ ...leg, market: asMarketType(leg.market, 'points') });
};

export function SnapshotReplayView({ legs, legInsights = [], snapshotId, traceId, replayEnabled = false }: SnapshotReplayViewProps) {
  const normalizedLegs: Array<{ leg: SnapshotReplayLeg; insight: PropLegInsight }> = legs.map((leg, index) => ({
    leg,
    insight: getInsight(leg, legInsights[index]),
  }));

  const parlayLegs: ParlayCorrelationLeg[] = normalizedLegs.map(({ leg }) => ({ ...leg }));
  const parlayRiskSummary = summarizeParlayRisk(parlayLegs);
  const parlayCorrelation = getParlayCorrelationScore(parlayLegs);

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-100">Snapshot Replay</h2>
        <p className="text-sm text-slate-400">{parlayRiskSummary} · Correlation strength: {parlayCorrelation.strength} ({parlayCorrelation.score})</p>
      </header>

      <div className="space-y-3">
        {normalizedLegs.map(({ leg, insight }, index) => {
          const trendSeries = trendSeriesForLeg(insight, leg);
          const linkedPairs = parlayCorrelation.correlatedPairs.filter((pair) => pair.first === index || pair.second === index);

          return (
            <article key={`${leg.selection}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{leg.selection}</h3>
                  <p className="text-xs text-slate-400">{insight.marketLabel} ({insight.marketType.toUpperCase()})</p>
                </div>
                <span className={`rounded border px-2 py-1 text-xs font-medium ${confidenceClassByRisk[insight.riskTag]}`}>
                  {insight.riskTag === 'Low' ? 'Solid confidence' : insight.riskTag === 'Medium' ? 'Medium confidence' : 'High variance'}
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <p className="text-xs text-slate-400">Trend (last 5)</p>
                  <div className="mt-2 flex items-end gap-1" aria-label="Trend chart last 5 games">
                    {trendSeries.map((value, trendIndex) => (
                      <div
                        key={`${leg.selection}-trend-${trendIndex}`}
                        title={`Game ${trendIndex + 1}: ${value}`}
                        className={`w-6 rounded-t ${barClass(value)}`}
                        style={{ height: `${Math.max(18, value)}px` }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Hit rate: {insight.hitRateLast5}% · {insight.trend}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <p>
                    <span className="font-medium text-slate-200">Matchup risk:</span> {insight.matchupNote}
                  </p>
                  <p>
                    <span className="font-medium text-slate-200">Injury impact:</span> {leg.injuryImpact ?? insight.injuryNote}
                  </p>
                  {linkedPairs.length > 0 ? (
                    <p className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-violet-200">
                      Correlated leg: {linkedPairs.map((pair) => pair.reason.replace('_', ' ')).join(', ')}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {replayEnabled && traceId ? (
        <footer>
          <Link href={`/research?trace_id=${traceId}&snapshotId=${encodeURIComponent(snapshotId ?? traceId)}&replay=1`} className="text-xs text-cyan-300 underline">
            Open replay graph for trace {traceId}
          </Link>
        </footer>
      ) : null}
    </section>
  );
}

export default SnapshotReplayView;
