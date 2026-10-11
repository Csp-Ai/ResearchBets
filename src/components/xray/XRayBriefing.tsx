'use client';

import { useMemo } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { reviewTicketAssumptions } from '@/src/core/slips/ticketAssumptions';
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
    return 'Check whether the requested threshold is necessary. Lowering it is not a verified market recommendation.';
  }
  if (flags.includes('longshot_odds') || flags.includes('plus_money')) {
    return 'Use a lower-variance version of this market instead of asking this leg to carry payout.';
  }
  return 'This leg carries the highest relative structural pressure in this ticket. Inspect its line and dependencies before deciding.';
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
  const assumptions = useMemo(() => reviewTicketAssumptions(normalized), [normalized]);
  const weakest = report.legs.find((leg) => leg.leg_id === report.weakest_leg_id) ?? report.legs[0];

  if (!isHydrated || slip.length === 0 || !weakest) return null;

  const hasKnownStructuralPressure = report.legs.some((leg) => (leg.flags?.length ?? 0) > 0);
  const repair = hasKnownStructuralPressure
    ? repairForFlags(weakest.flags ?? [])
    : 'No major correlation or pricing structure flag was identified from the information supplied. This does not mean the ticket is safe.';
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
        {hasKnownStructuralPressure ? <>Main structural pressure: {weakestName}.</> : 'No clear structural breaker identified yet.'}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
        {market}{typeof weakest.line === 'number' ? ` · ${weakest.line}` : ''}. {repair}
      </p>

      {assumptions.primary ? (
        <aside className="mt-5 rounded-xl border border-amber-300/25 bg-amber-200/[0.045] p-4" data-testid="xray-assumption-review">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
            Ticket assumption check · {assumptions.primary.evidence === 'confirmed_structure' ? 'Ticket-confirmed structure' : 'More evidence required'}
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-50">{assumptions.primary.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-200">{assumptions.primary.why}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300"><strong>Countercase:</strong> {assumptions.primary.countercase}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300"><strong>Verify:</strong> {assumptions.primary.toVerify}</p>
          <p className="mt-2 text-sm leading-6 text-amber-100"><strong>Next:</strong> {assumptions.primary.action}</p>
          {assumptions.findings.length > 1 ? (
            <p className="mt-2 text-xs text-slate-400">{assumptions.findings.length - 1} additional ticket assumption{assumptions.findings.length === 2 ? '' : 's'} also need review.</p>
          ) : null}
        </aside>
      ) : (
        <p className="mt-5 text-xs leading-5 text-slate-400" data-testid="xray-assumption-review">
          No ticket-level contradiction or shared rushing assumption was identified from the supplied fields. This is not proof that the legs are independent or likely to win.
        </p>
      )}

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
        Check the ticket&apos;s fields and exposure. Injuries, recent hit rates, and live sportsbook prices are not validated by this structural score.
      </p>
    </section>
  );
}
