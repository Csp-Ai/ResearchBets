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
  snapshotId?: string;
  traceId?: string;
  replayEnabled?: boolean;
}

const confidenceClassByRisk: Record<PropLegInsight['riskTag'], string> = {
  Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  High: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
};

const volatilityTone: Record<PropLegInsight['riskTag'], string> = {
  Low: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  Medium: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  High: 'text-rose-300 border-rose-500/40 bg-rose-500/10'
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
    Math.min(seed + (insight.riskTag === 'High' ? -3 : 6), 95)
  ];
};

const getInsight = (leg: SnapshotReplayLeg, insight?: PropLegInsight): PropLegInsight => {
  if (insight) return insight;
  return buildPropLegInsight({ ...leg, market: asMarketType(leg.market, 'points') });
};

function ladderLineForRisk(insight: PropLegInsight): string {
  if (insight.riskTag !== 'High') return 'No ladder needed on this profile.';
  return 'Ladder? Start with a safer base line, then optionally add a smaller exposure ladder rung.';
}

function confidenceDropLabel(correlationStrength: 'low' | 'medium' | 'high'): string {
  if (correlationStrength === 'high')
    return 'Confidence drop: -16% due to heavy same-game overlap.';
  if (correlationStrength === 'medium')
    return 'Confidence drop: -9% from moderate cross-leg dependency.';
  return 'Confidence drop: -3% (minimal correlation drag).';
}

export function SnapshotReplayView({
  legs,
  legInsights = [],
  snapshotId,
  traceId,
  replayEnabled = false
}: SnapshotReplayViewProps) {
  const normalizedLegs: Array<{ leg: SnapshotReplayLeg; insight: PropLegInsight }> = legs.map(
    (leg, index) => ({
      leg,
      insight: getInsight(leg, legInsights[index])
    })
  );

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
          {parlayRiskSummary} · Correlation strength: {parlayCorrelation.strength} (
          {parlayCorrelation.score})
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">
            Parlay style: {parlayStyle}
          </span>
          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-violet-200">
            {confidenceDropLabel(parlayCorrelation.strength)}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
            Next action: inspect highest-variance leg before lock-in.
          </span>
        </div>
      </header>

      {parlayCorrelation.correlatedPairs.length > 0 ? (
        <section className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-xs text-violet-100">
          <p className="font-medium">Same-game/same-team overlap detected</p>
          <ul className="mt-2 space-y-1 text-violet-200/90">
            {parlayCorrelation.correlatedPairs.map((pair, idx) => (
              <li key={`pair-${pair.first}-${pair.second}-${idx}`}>
                Leg {pair.first + 1} ↔ Leg {pair.second + 1}:{' '}
                {pair.reason === 'same_game' ? 'same game environment' : 'same team dependency'}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {altLegSuggestion ? (
        <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-medium">Alt-leg suggestion</p>
          <p className="mt-1 text-amber-200">
            Leg {altLegSuggestion.legIndex + 1}: {altLegSuggestion.suggestionLabel}
          </p>
        </section>
      ) : null}

      <div className="space-y-3">
        {normalizedLegs.map(({ leg, insight }, index) => {
          const trendSeries = trendSeriesForLeg(insight, leg);
          const linkedPairs = parlayCorrelation.correlatedPairs.filter(
            (pair) => pair.first === index || pair.second === index
          );
          const matchupLine = `vs ${leg.defenseRank ?? (insight.riskTag === 'High' ? 7 : insight.riskTag === 'Medium' ? 16 : 26)}th ranked defense`;

          return (
            <article
              key={`${leg.selection}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{leg.selection}</h3>
                  <p className="text-xs text-slate-400">
                    {insight.marketLabel}{' '}
                    <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-semibold text-slate-200">
                      {MARKET_TYPE_TAGS[insight.marketType] ?? insight.marketType.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-2 py-1 text-xs font-medium ${confidenceClassByRisk[insight.riskTag]}`}
                  >
                    {insight.riskTag === 'Low'
                      ? 'Solid confidence'
                      : insight.riskTag === 'Medium'
                        ? 'Medium confidence'
                        : 'High variance'}
                  </span>
                  <span
                    className={`rounded border px-2 py-1 text-xs font-medium ${volatilityTone[insight.riskTag]}`}
                  >
                    Volatility: {insight.riskTag}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
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
                  <p className="mt-2 text-xs text-slate-400">
                    Hit rate: {insight.hitRateLast5}% · {insight.trend}
                  </p>
                  <p className="mt-2 rounded border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
                    Matchup: {matchupLine}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <p>
                    <span className="font-medium text-slate-200">Matchup risk:</span>{' '}
                    {insight.matchupNote}
                  </p>
                  <p>
                    <span className="font-medium text-slate-200">Injury impact:</span>{' '}
                    {leg.injuryImpact ?? insight.injuryNote}
                  </p>
                  {linkedPairs.length > 0 ? (
                    <p className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-violet-200">
                      Correlated leg:{' '}
                      {linkedPairs.map((pair) => pair.reason.replace('_', ' ')).join(', ')}
                    </p>
                  ) : null}
                  {insight.riskTag === 'High' ? (
                    <p className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">
                      <span className="mr-1 rounded-full border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold">
                        Ladder?
                      </span>
                      {ladderLineForRisk(insight)}
                    </p>
                  ) : null}
                  <p className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                    Next action: open replay evidence for this leg.
                  </p>
                </div>
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
