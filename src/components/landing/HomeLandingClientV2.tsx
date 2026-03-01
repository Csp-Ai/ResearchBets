'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { appendQuery } from '@/src/components/landing/navigation';
import { asMarketType } from '@/src/core/markets/marketType';
import { toHref } from '@/src/core/nervous/routes';
import type { QuerySpine } from '@/src/core/nervous/spine';
import { getLatestTraceId } from '@/src/core/run/store';
import { computeSlipIntelligence } from '@/src/core/slips/slipIntelligence';
import type { TodayMode, TodayPayload } from '@/src/core/today/types';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type Props = { spine: QuerySpine };

type PreviewProp = {
  id: string;
  gameId: string;
  matchup: string;
  player: string;
  market: string;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: string;
};

const MODE_COPY: Record<TodayMode, string> = {
  live: 'Live feeds on',
  cache: 'Using cached slate',
  demo: 'Demo mode (live feeds off)'
};

const riskLabel = (riskTag: string) => {
  if (riskTag === 'watch') return 'minutes';
  return riskTag || 'pace';
};

const toLeg = (prop: PreviewProp): SlipBuilderLeg => ({
  id: prop.id,
  player: prop.player,
  marketType: asMarketType(prop.market, 'points'),
  line: prop.line,
  odds: prop.odds,
  confidence: Math.max(0, Math.min(1, prop.hitRateL10 / 100)),
  volatility: prop.riskTag === 'watch' ? 'medium' : 'low',
  game: prop.matchup
});

function weakestLegLabel(legs: SlipBuilderLeg[], allProps: PreviewProp[]): string {
  if (legs.length < 2) return 'Add one more leg to isolate pressure';
  const byId = new Map(allProps.map((row) => [row.id, row]));
  const weakest = [...legs]
    .sort((a, b) => {
      const aProp = byId.get(a.id);
      const bProp = byId.get(b.id);
      const aWatch = aProp?.riskTag === 'watch' ? 1 : 0;
      const bWatch = bProp?.riskTag === 'watch' ? 1 : 0;
      if (aWatch !== bWatch) return bWatch - aWatch;
      return (a.confidence ?? 0) - (b.confidence ?? 0);
    })[0];
  if (!weakest) return 'No weakest leg yet';
  return `${weakest.player} ${weakest.line} ${weakest.marketType.toUpperCase()}`;
}

function groupedPreview(payload: TodayPayload | null): PreviewProp[] {
  if (!payload) return [];
  const fromBoard = (payload.board ?? []).slice(0, 12).map((row) => ({
    id: row.id,
    gameId: row.gameId,
    matchup: row.matchup ?? row.gameId,
    player: row.player,
    market: row.market,
    line: row.line ?? '',
    odds: row.odds ?? '-110',
    hitRateL10: row.hitRateL10 ?? 55,
    riskTag: row.riskTag ?? 'watch'
  }));

  if (fromBoard.length > 0) return fromBoard;

  return payload.games.flatMap((game) => game.propsPreview.slice(0, 2).map((prop) => ({
    id: prop.id,
    gameId: game.id,
    matchup: game.matchup,
    player: prop.player,
    market: prop.market,
    line: prop.line ?? '',
    odds: prop.odds ?? '-110',
    hitRateL10: prop.hitRateL10 ?? 55,
    riskTag: prop.riskTag ?? 'watch'
  })));
}

function sampleSlip(mode: TodayMode): SlipBuilderLeg[] {
  return [
    { id: `sample-1-${mode}`, player: 'Jalen Brunson', marketType: 'assists', line: '6.5', odds: '-115', confidence: 0.62, volatility: 'medium', game: 'NYK @ BOS' },
    { id: `sample-2-${mode}`, player: 'Jaylen Brown', marketType: 'points', line: '22.5', odds: '-108', confidence: 0.58, volatility: 'medium', game: 'NYK @ BOS' }
  ];
}

export default function HomeLandingClientV2({ spine }: Props) {
  const { slip, addLeg, removeLeg, setSlip, updateLeg } = useDraftSlip();
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);
  const firstAddButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setLatestTraceId(getLatestTraceId());
  }, []);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ sport: spine.sport, date: spine.date, tz: spine.tz, mode: spine.mode }).toString();
    fetch(`/api/today?${query}`)
      .then((response) => response.json())
      .then((json: { data?: TodayPayload }) => {
        if (!active) return;
        setPayload(json.data ?? null);
      })
      .catch(() => {
        if (!active) return;
        setPayload(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [spine.date, spine.mode, spine.sport, spine.tz]);

  const previewProps = useMemo(() => groupedPreview(payload), [payload]);
  const previewByGame = useMemo(() => {
    const group = new Map<string, PreviewProp[]>();
    previewProps.forEach((row) => {
      const key = row.matchup || row.gameId;
      const current = group.get(key) ?? [];
      current.push(row);
      group.set(key, current);
    });
    return [...group.entries()];
  }, [previewProps]);

  const intel = useMemo(() => computeSlipIntelligence(slip.map((leg) => ({
    id: leg.id,
    player: leg.player,
    marketType: leg.marketType,
    line: leg.line,
    odds: leg.odds,
    game: leg.game
  }))), [slip]);

  const traceId = spine.trace_id || latestTraceId || undefined;
  const runStressHref = appendQuery(toHref('/stress-test', { ...spine, trace_id: traceId }), {});
  const sampleStressHref = appendQuery(toHref('/stress-test', { ...spine, mode: 'demo', trace_id: traceId }), { sample: '1' });

  return (
    <section className="space-y-6" aria-label="home-landing-v2">
      <header className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">ResearchBets</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Build sharper slips in the real betting loop.</h1>
        <p className="mt-2 text-base text-slate-300">Find the weakest leg before you place it.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              firstAddButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              firstAddButtonRef.current?.focus();
            }}
            className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Build a slip
          </button>
          <Link href={sampleStressHref} className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100">See a sample run</Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article id="tonight-board-preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" aria-label="tonight-preview-mini">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Tonight&apos;s Board</h2>
            <span data-testid="today-mode-chip" className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-slate-200">{MODE_COPY[payload?.mode ?? 'demo']}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Leads only. Add 1–3 legs and run a preflight stress test.</p>
          <div className="mt-3 space-y-3">
            {loading ? <p className="text-sm text-slate-400">Loading board…</p> : null}
            {!loading && previewByGame.length === 0 ? <p className="text-sm text-slate-400">Board unavailable. Demo leads stay on by default.</p> : null}
            {previewByGame.map(([matchup, rows]) => (
              <div key={matchup} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{matchup}</p>
                {rows.map((row, index) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{row.player} · {row.market.toUpperCase()} {row.line} <span className="mono-number">{row.odds}</span></p>
                      <p className="text-xs text-slate-400">L10 {Math.round(row.hitRateL10)}% · {riskLabel(row.riskTag)}</p>
                    </div>
                    <button
                      ref={index === 0 ? firstAddButtonRef : undefined}
                      type="button"
                      onClick={() => addLeg(toLeg(row))}
                      className="rounded border border-cyan-300/60 px-2 py-1 text-xs text-cyan-100"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" aria-label="quick-slip-rail-mini">
          <h2 className="text-lg font-semibold text-white">QuickSlip Rail</h2>
          <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
            <p>{slip.length} legs · Correlation {intel.correlationScore >= 65 ? 'high' : intel.correlationScore >= 35 ? 'med' : 'low'}</p>
            <p>Fragility {intel.fragilityScore}/100</p>
            <p>Weakest leg: {weakestLegLabel(slip, previewProps)}</p>
          </div>

          {slip.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-white/20 p-4 text-sm text-slate-300">
              <p>Add 2–3 legs to stress test the slip.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => firstAddButtonRef.current?.focus()} className="rounded border border-white/20 px-2 py-1">Start from Board</button>
                <button type="button" onClick={() => setSlip(sampleSlip('demo'))} className="rounded border border-cyan-300/60 px-2 py-1 text-cyan-100">Try sample slip</button>
              </div>
            </div>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {slip.map((leg) => (
                <li key={leg.id} className="rounded-lg border border-white/10 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-slate-100">{leg.player} · {leg.marketType.toUpperCase()} {leg.line}</p>
                    <button type="button" onClick={() => removeLeg(leg.id)} className="text-xs text-slate-300">Remove</button>
                  </div>
                  <label className="mt-2 block text-xs text-slate-400">
                    Line
                    <input
                      aria-label={`line-${leg.id}`}
                      value={leg.line}
                      onChange={(event) => updateLeg({ ...leg, line: event.target.value })}
                      className="mt-1 w-24 rounded border border-white/20 bg-slate-950/60 px-2 py-1 text-slate-100"
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={runStressHref} className="rounded bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950">Run Stress Test</Link>
            <Link href={sampleStressHref} className="rounded border border-white/20 px-3 py-2 text-sm text-slate-100">Try sample slip</Link>
          </div>
        </article>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="loop-strip">
        <div className="grid gap-3 sm:grid-cols-3">
          <p className="text-sm text-slate-200"><strong>Build</strong><br />Stage 2–4 legs from the board.</p>
          <p className="text-sm text-slate-200"><strong>Stress Test</strong><br />We isolate the weakest leg + correlation pressure.</p>
          <p className="text-sm text-slate-200"><strong>Track &amp; Learn</strong><br />We follow DURING changes and write the postmortem.</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="differentiators">
        <article className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-300"><p className="font-medium text-white">Weakest-leg finder</p><p className="mt-1">Surface why one leg carries most downside before submit.</p></article>
        <article className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-300"><p className="font-medium text-white">Deterministic checks</p><p className="mt-1">No hype picks. Structured pressure checks you can rerun.</p></article>
        <article className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-300"><p className="font-medium text-white">DURING + AFTER</p><p className="mt-1">Track live drift, then save the lesson for the next card.</p></article>
      </section>

      <section className="space-y-2" aria-label="during-after-previews">
        <details>
          <summary className="cursor-pointer rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-200">What you&apos;ll see DURING</summary>
          <div className="mt-2 rounded-lg border border-white/10 p-3 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Live Leg Tracker · Tyrese Haliburton AST</p>
            <p className="mt-1">3/8 assists</p>
            <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 w-[38%] rounded-full bg-cyan-300" /></div>
            <p className="mt-2">Pace projection: 7.4 · Remaining: 18:22 · Status: volatile</p>
            <p className="mt-1 text-xs text-slate-400">During is about changes — not panic.</p>
          </div>
        </details>
        <details>
          <summary className="cursor-pointer rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-200">AFTER preview</summary>
          <div className="mt-2 rounded-lg border border-white/10 p-3 text-sm text-slate-300">
            <p>Weakest leg missed by 1. Trend: assist volatility when opponent slows pace.</p>
            <Link href={toHref('/review', { ...spine, trace_id: traceId })} className="mt-2 inline-flex rounded border border-white/20 px-2 py-1 text-xs text-slate-100">Review last run</Link>
          </div>
        </details>
      </section>

      <section className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-4" aria-label="closing-cta-strip">
        <h2 className="text-lg font-semibold text-white">Run a stress test now</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={runStressHref} className="rounded bg-cyan-300 px-3 py-2 font-semibold text-slate-950">Run a stress test now</Link>
          {traceId ? <Link href={toHref('/stress-test', { ...spine, trace_id: traceId })} className="rounded border border-white/20 px-3 py-2 text-slate-100">Open latest run</Link> : null}
        </div>
      </section>
    </section>
  );
}
