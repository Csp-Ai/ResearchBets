'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { BoardTerminalTable, sortBoardRows, type TerminalBoardRow } from '@/src/components/today/BoardTerminalTable';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import type { MarketType } from '@/src/core/markets/marketType';
import { detectReactiveWindow } from '@/src/core/slate/reactiveWindow';
import { buildSlateSummary } from '@/src/core/slate/slateEngine';
import type { BoardProp } from '@/src/core/slate/leadEngine';
import { generateRankedLeads } from '@/src/core/slate/leadEngine';
import type { TodayPayload } from '@/src/core/today/types';

function asBoardProps(payload: TodayPayload): BoardProp[] {
  return payload.games.flatMap((game, gameIndex) => game.propsPreview.map((prop, propIndex) => ({
    id: prop.id,
    player: prop.player,
    market: prop.market,
    line: prop.line ?? 'N/A',
    odds: prop.odds ?? '-110',
    hitRateL10: prop.hitRateL10 ?? (56 + ((gameIndex + propIndex) % 20)),
    riskTag: prop.riskTag ?? (((gameIndex + propIndex) % 3 === 0) ? 'watch' : 'stable'),
    gameId: game.id
  })));
}

function toBoardRows(payload: TodayPayload): TerminalBoardRow[] {
  return payload.games.flatMap((game, gameIndex) => game.propsPreview.map((prop, propIndex) => ({
    id: prop.id,
    gameId: game.id,
    matchup: game.matchup,
    startTime: game.startTime,
    player: prop.player,
    market: prop.market,
    line: prop.line ?? 'N/A',
    odds: prop.odds ?? '-110',
    hitRateL10: prop.hitRateL10 ?? (56 + ((gameIndex + propIndex) % 20)),
    marketImpliedProb: prop.marketImpliedProb ?? 0.52,
    modelProb: prop.modelProb ?? 0.54,
    edgeDelta: prop.edgeDelta ?? 0.02,
    riskTag: prop.riskTag ?? (((gameIndex + propIndex) % 3 === 0) ? 'watch' : 'stable')
  })));
}

function prepLabel(score: number) {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Partial';
  return 'Low';
}

const modeTone: Record<TodayPayload['mode'], string> = {
  live: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
  cache: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10',
  demo: 'text-amber-200 border-amber-400/40 bg-amber-500/10'
};

export function TonightPageClient({ payload }: { payload: TodayPayload }) {
  const draft = useDraftSlip();
  const [highConvictionOnly, setHighConvictionOnly] = useState(false);
  const slateSummary = useMemo(() => buildSlateSummary(payload), [payload]);
  const reactiveWindow = useMemo(() => detectReactiveWindow(payload), [payload]);
  const board = useMemo(() => asBoardProps(payload), [payload]);
  const rankedLeads = useMemo(() => generateRankedLeads(board, slateSummary, {
    maxLeads: 8,
    diversifyAcrossGames: true,
    maxPerGame: 2,
    reactive: { isReactive: reactiveWindow.isReactive },
    minConviction: highConvictionOnly ? 70 : undefined
  }), [board, highConvictionOnly, reactiveWindow.isReactive, slateSummary]);
  const boardRows = useMemo(() => sortBoardRows(toBoardRows(payload), 'edge'), [payload]);

  const addLeadToDraft = (leg: BoardProp) => {
    const mapped: SlipBuilderLeg = {
      id: leg.id,
      player: leg.player,
      marketType: leg.market as MarketType,
      line: leg.line,
      odds: leg.odds,
      volatility: leg.riskTag === 'stable' ? 'low' : 'high'
    };
    draft.addLeg(mapped);
  };

  return (
    <section className="space-y-4 pb-20">
      <header className="rounded-xl border border-white/10 bg-slate-950/65 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tonight&apos;s Board</p>
            <h1 className="text-2xl font-semibold text-white">Primary Decision Surface</h1>
            <p className="mt-1 text-xs text-slate-300">Prepared {new Date(slateSummary.preparedAtIso).toLocaleString()}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs uppercase ${modeTone[payload.mode]}`}>{payload.mode} mode</span>
        </div>
      </header>

      {reactiveWindow.isReactive ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3">
          <p className="text-sm font-semibold text-amber-100">Reactive window detected</p>
          <p className="text-xs text-amber-50/90">Stable builds prioritized to reduce volatility.</p>
        </div>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Slate Summary</h2>
        <p className="mt-2 text-sm text-slate-200">{slateSummary.narrative}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/20 px-2 py-1">Pace: {slateSummary.bias.pace}</span>
          <span className="rounded-full border border-white/20 px-2 py-1">Scoring: {slateSummary.bias.scoring}</span>
          <span className="rounded-full border border-white/20 px-2 py-1">Assist trend: {slateSummary.bias.assistTrend ? 'On' : 'Selective'}</span>
        </div>
        {slateSummary.volatilityFlags.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
            {slateSummary.volatilityFlags.map((flag) => <li key={flag}>{flag}</li>)}
          </ul>
        ) : null}
        <p className="mt-3 text-sm text-slate-300">Prep confidence: <span className="font-semibold text-white">{slateSummary.prepConfidence}%</span> ({prepLabel(slateSummary.prepConfidence)})</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">High-Probability Leads (Diversified)</h2>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={highConvictionOnly} onChange={(event) => setHighConvictionOnly(event.target.checked)} />
            Show only high conviction
          </label>
        </div>
        {rankedLeads.length === 0 ? (
          <p className="rounded border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">No leads ≥70 tonight. Drop threshold or use Manual Board.</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rankedLeads.map((lead) => (
            <article key={lead.prop.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{lead.prop.player} · {lead.prop.market} {lead.prop.line}</h3>
                <span className="text-xs text-cyan-300">Conviction {lead.convictionScore}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-white/20 px-2 py-1">Volatility: {lead.volatility}</span>
                <span className="rounded-full border border-white/20 px-2 py-1">Script fit: {lead.scriptFit}</span>
              </div>
              <p className="mt-2 text-xs text-slate-300">{lead.reasoning}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => <span key={`${lead.prop.id}-${tag}`} className="rounded-full border border-cyan-300/25 px-2 py-0.5 text-[10px] text-cyan-100">{tag}</span>)}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" className="flex-1 rounded border border-cyan-400/50 bg-cyan-500/10 px-2 py-1.5 text-sm" onClick={() => addLeadToDraft(lead.prop)}>Add to Draft</button>
                <Link href="#manual-board" className="rounded border border-white/20 px-2 py-1.5 text-xs text-slate-200">View in Board</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="manual-board" className="space-y-2">
        <h2 className="text-lg font-semibold">Manual Board</h2>
        <p className="text-xs text-slate-400">Secondary scan for discretionary pivots.</p>
        <BoardTerminalTable rows={boardRows} selectedLegIds={new Set(draft.slip.map((leg) => leg.id))} onToggleLeg={(row) => {
          const exists = draft.slip.some((leg) => leg.id === row.id);
          if (exists) {
            draft.removeLeg(row.id);
            return;
          }
          draft.addLeg({
            id: row.id,
            player: row.player,
            marketType: row.market,
            line: row.line ?? 'N/A',
            odds: row.odds,
            volatility: row.riskTag === 'stable' ? 'low' : 'high',
            game: row.matchup
          });
        }} />
      </section>
    </section>
  );
}
