'use client';

import { useMemo } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import {
  buildSlipStructureReport,
  computeSlipIntelligence,
  type SlipIntelLeg,
} from '@/src/core/slips/slipIntelligence';

const parseLine = (value: string): string | undefined => value.match(/-?\d+(?:\.\d+)?/)?.[0];

const readable = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const repairForFlags = (flags: string[]) => {
  if (flags.includes('same_player_dependency')) {
    return 'Break one same-player dependency so one player cannot collapse multiple legs.';
  }
  if (flags.includes('same_game_script')) {
    return 'Move one leg to another game if you want less shared game-script exposure.';
  }
  if (flags.includes('aggressive_line')) {
    return 'Keep the player read, but lower this threshold before adding more risk.';
  }
  if (flags.includes('longshot_odds') || flags.includes('plus_money')) {
    return 'Use a lower-variance version of this market instead of asking this leg to carry payout.';
  }
  return 'This is the ticket’s weakest structural point. Trimming it is the cleanest repair.';
};

export function XRayBriefing() {
  const nervous = useNervousSystem();
  const { slip, isHydrated } = useDraftSlip();

  const normalized = useMemo<SlipIntelLeg[]>(
    () =>
      slip.map((leg) => ({
        id: leg.id,
        player: leg.player,
        selection: `${leg.player} ${leg.line}`,
        marketType: leg.marketType,
        market: leg.marketType,
        line: parseLine(leg.line),
        odds: leg.odds,
        game: leg.game,
        matchup: leg.game,
      })),
    [slip],
  );

  const report = useMemo(
    () => buildSlipStructureReport(normalized, { mode: nervous.mode }),
    [normalized, nervous.mode],
  );
  const intelligence = useMemo(() => computeSlipIntelligence(normalized), [normalized]);
  const weakest = report.legs.find((leg) => leg.leg_id === report.weakest_leg_id) ?? report.legs[0];

  if (!isHydrated || slip.length === 0 || !weakest) return null;

  const repair = repairForFlags(weakest.flags ?? []);
  const weakestName = weakest.player ?? weakest.notes ?? 'Weakest leg';
  const market = readable(weakest.market ?? 'market');
  const flags = (weakest.flags ?? []).slice(0, 2).map(readable);

  return (
    <section className="border-y border-white/10 py-6" data-testid="xray-briefing">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
          ResearchBets X-Ray
        </p>
        <p className="m-0 text-xs text-slate-500">Structural risk, not a win-probability claim</p>
      </div>

      <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-slate-50 sm:text-4xl">
        {weakestName} is the first place this ticket can break.
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
        {market}{typeof weakest.line === 'number' ? ` · ${weakest.line}` : ''}. {repair}
      </p>

      <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
        <div className="bg-slate-950/95 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Fragility</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">{intelligence.fragilityScore}</p>
        </div>
        <div className="bg-slate-950/95 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Correlation</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">{intelligence.correlationScore}</p>
        </div>
        <div className="bg-slate-950/95 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Weakest leg score</p>
          <p className="mt-1 font-mono text-xl font-semibold text-amber-100">{weakest.fragility_score ?? 0}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        {flags.length > 0 ? flags.map((flag) => <span key={flag}>{flag}</span>) : <span>No major structural flag beyond relative weakness.</span>}
        <span>{report.correlation_edges.length} dependency link{report.correlation_edges.length === 1 ? '' : 's'} detected</span>
      </div>

      <p className="mt-5 text-sm text-cyan-100">
        <span className="text-cyan-200/70">Next action · </span>
        Repair this leg or accept the risk, then carry the same ticket into live tracking.
      </p>
    </section>
  );
}
