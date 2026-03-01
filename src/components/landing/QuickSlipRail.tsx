'use client';

import React from 'react';
import Link from 'next/link';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { BoardProp } from '@/src/core/today/boardModel';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { Panel, PanelHeader } from '@/src/components/landing/ui';

const toSlipMarketType = (market: string) => {
  const normalized = market.toLowerCase();
  if (normalized === 'total' || normalized === 'spread' || normalized === 'moneyline' || normalized === 'points' || normalized === 'threes' || normalized === 'rebounds' || normalized === 'assists' || normalized === 'ra' || normalized === 'pra') return normalized;
  return 'points';
};

export function QuickSlipRail({
  slip,
  runAnalysisHref,
  sampleSlipHref,
  latestRunHref,
  board,
  onAddLeg,
  onRemoveLeg,
  onEditLeg
}: {
  slip: SlipBuilderLeg[];
  runAnalysisHref: string;
  sampleSlipHref: string;
  latestRunHref: string | null;
  board: BoardProp[];
  onAddLeg: (leg: SlipBuilderLeg) => void;
  onRemoveLeg: (id: string) => void;
  onEditLeg: (leg: SlipBuilderLeg) => void;
}) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const slipIds = React.useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const weakestPreview = React.useMemo(() => {
    if (slip.length < 2) return null;
    const report = buildSlipStructureReport(slip.map((leg) => ({
      id: leg.id,
      player: leg.player,
      marketType: leg.marketType,
      line: leg.line,
      odds: leg.odds,
      game: leg.game
    })));
    if (!report.weakest_leg_id) return null;
    const weakestLeg = slip.find((leg) => leg.id === report.weakest_leg_id);
    if (!weakestLeg) return null;
    const replacements = board
      .filter((prop) => !slipIds.has(prop.id))
      .filter((prop) => prop.market === weakestLeg.marketType || prop.matchup === weakestLeg.game || prop.gameId === weakestLeg.game)
      .slice(0, 2);
    return {
      weakestLeg,
      reasons: report.failure_forecast.top_reasons.slice(0, 2),
      replacements
    };
  }, [board, slip, slipIds]);

  const autoBuild = React.useCallback((style: 'safe' | 'safe_upside') => {
    const selected: BoardProp[] = [];
    const usedGames = new Set<string>();

    const pickFrom = (pool: BoardProp[], count: number, preferDiverse: boolean) => {
      for (const prop of pool) {
        if (selected.length >= count) break;
        if (selected.some((leg) => leg.id === prop.id)) continue;
        if (preferDiverse && usedGames.has(prop.gameId)) continue;
        selected.push(prop);
        usedGames.add(prop.gameId);
      }
    };

    const stable = board.filter((prop) => prop.riskTag === 'stable');
    const watch = board.filter((prop) => prop.riskTag !== 'stable');

    const safeTarget = style === 'safe' ? 3 : 2;
    pickFrom(stable, safeTarget, true);
    pickFrom(stable, safeTarget, false);
    pickFrom(watch, safeTarget, true);

    if (style === 'safe_upside') {
      pickFrom(watch, 3, true);
      pickFrom(watch, 3, false);
    } else {
      pickFrom(watch, 3, false);
    }

    selected.slice(0, 3).forEach((prop) => {
      onAddLeg({
        id: prop.id,
        player: prop.player,
        marketType: toSlipMarketType(prop.market),
        line: prop.line,
        odds: prop.odds,
        game: prop.gameId
      });
    });
  }, [board, onAddLeg]);

  return (
    <Panel data-testid="quick-slip-rail">
      <PanelHeader title="QuickSlip" subtitle="Draft legs ready for a fast run" />

      {slip.length === 0 ? (
        <div className="space-y-2" data-testid="quick-slip-empty-state">
          <p className="text-xs text-white/60">No legs yet. Start from any entry point.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={sampleSlipHref} className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Paste slip</Link>
            <Link href={sampleSlipHref} className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Try sample slip</Link>
            <a href="#board-section" className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Build from Board</a>
            <button type="button" onClick={() => autoBuild('safe')} className="rounded-xl border border-emerald-300/35 px-3 py-1.5 text-sm text-emerald-100">Auto-build 3 safe</button>
            <button type="button" onClick={() => autoBuild('safe_upside')} className="rounded-xl border border-amber-300/35 px-3 py-1.5 text-sm text-amber-100">Auto-build 2 safe + 1 upside</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {weakestPreview ? (
            <div className="rounded-xl border border-amber-300/25 bg-amber-400/5 p-2" data-testid="pre-run-guardrail">
              <p className="text-xs font-semibold text-amber-100">Weakest leg right now: {weakestPreview.weakestLeg.player} · {weakestPreview.weakestLeg.marketType.toUpperCase()}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-100/90">
                {weakestPreview.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setShowSuggestions(true);
                  document.getElementById('board-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="mt-2 rounded-lg border border-amber-300/40 px-2 py-1 text-xs text-amber-100"
              >
                Swap weakest from board
              </button>
              {showSuggestions && weakestPreview.replacements.length > 0 ? (
                <div className="mt-2 space-y-1" data-testid="suggested-replacements">
                  <p className="text-[11px] text-white/70">Suggested replacements</p>
                  {weakestPreview.replacements.map((prop) => (
                    <div key={prop.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2 py-1 text-xs">
                      <p className="truncate text-slate-100">{prop.player} · {prop.market.toUpperCase()} {prop.line}</p>
                      <button
                        type="button"
                        onClick={() => onAddLeg({ id: prop.id, player: prop.player, marketType: toSlipMarketType(prop.market), line: prop.line, odds: prop.odds, game: prop.matchup })}
                        className="rounded border border-cyan-300/40 px-1.5 py-0.5 text-cyan-100"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <ul className="space-y-2">
            {slip.map((leg) => (
              <li key={leg.id} className="rounded-xl border border-white/10 bg-slate-900/65 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-slate-100">{leg.player} · {leg.marketType.toUpperCase()}</p>
                  <button type="button" onClick={() => onRemoveLeg(leg.id)} className="text-xs text-slate-300 underline underline-offset-2">Remove</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                  <label className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-slate-300">
                    line
                    <input
                      value={leg.line}
                      onChange={(event) => onEditLeg({ ...leg, line: event.target.value })}
                      className="w-full bg-transparent text-slate-100 outline-none"
                      aria-label={`Edit line ${leg.player}`}
                    />
                  </label>
                  <label className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-slate-300">
                    odds
                    <input
                      value={leg.odds ?? ''}
                      onChange={(event) => onEditLeg({ ...leg, odds: event.target.value })}
                      className="w-full bg-transparent text-slate-100 outline-none"
                      aria-label={`Edit odds ${leg.player}`}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={runAnalysisHref}
          aria-disabled={slip.length === 0}
          className="rounded-xl border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950"
        >
          Run analysis
        </Link>
        {latestRunHref ? <Link href={latestRunHref} className="text-xs text-cyan-100 underline underline-offset-2">Open latest run</Link> : null}
      </div>
    </Panel>
  );
}
