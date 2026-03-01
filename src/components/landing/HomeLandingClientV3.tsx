'use client';

import { useEffect, useMemo, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { AfterPreviewMini } from '@/src/components/landing/AfterPreviewMini';
import { appendQuery } from '@/src/components/landing/navigation';
import { BoardMini, type BoardRow } from '@/src/components/landing/BoardMini';
import { DuringPreviewMini } from '@/src/components/landing/DuringPreviewMini';
import { QuickSlipRailMini } from '@/src/components/landing/QuickSlipRailMini';
import { RunPulseStrip } from '@/src/components/landing/RunPulseStrip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { asMarketType } from '@/src/core/markets/marketType';
import type { QuerySpine } from '@/src/core/nervous/spine';
import { getLatestTraceId } from '@/src/core/run/store';
import { computeSlipIntelligence } from '@/src/core/slips/slipIntelligence';
import type { TodayMode, TodayPayload } from '@/src/core/today/types';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

const MODE_COPY: Record<TodayMode, string> = {
  live: 'Live feeds on',
  cache: 'Using cached slate',
  demo: 'Demo mode (live feeds off)',
};

function toBoardRows(payload: TodayPayload | null): BoardRow[] {
  if (!payload) return [];
  const fromBoard = (payload.board ?? []).slice(0, 12).map((row) => ({
    id: row.id,
    matchup: row.matchup ?? row.gameId,
    player: row.player,
    market: row.market,
    line: row.line ?? '',
    odds: row.odds ?? '-110',
    hitRateL10: row.hitRateL10 ?? 55,
    riskTag: row.riskTag ?? 'watch',
  }));
  if (fromBoard.length > 0) return fromBoard;
  return payload.games.flatMap((game) =>
    game.propsPreview.slice(0, 2).map((prop) => ({
      id: prop.id,
      matchup: game.matchup,
      player: prop.player,
      market: prop.market,
      line: prop.line ?? '',
      odds: prop.odds ?? '-110',
      hitRateL10: prop.hitRateL10 ?? 55,
      riskTag: prop.riskTag ?? 'watch',
    })),
  );
}

function toLeg(row: BoardRow): SlipBuilderLeg {
  return {
    id: row.id,
    player: row.player,
    marketType: asMarketType(row.market, 'points'),
    line: row.line,
    odds: row.odds,
    confidence: Math.max(0, Math.min(1, row.hitRateL10 / 100)),
    volatility: row.riskTag === 'watch' ? 'medium' : 'low',
    game: row.matchup,
  };
}

function weakestLegLabel(legs: SlipBuilderLeg[]): string {
  if (legs.length < 2) return 'Add one more leg to isolate pressure';
  const weakest = [...legs].sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))[0];
  if (!weakest) return 'No weakest leg yet';
  return `${weakest.player} ${weakest.line} ${weakest.marketType.toUpperCase()}`;
}

export default function HomeLandingClientV3({ spine }: { spine: QuerySpine }) {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg, updateLeg } = useDraftSlip();
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);
  const [flashLegId, setFlashLegId] = useState<string | null>(null);
  const [duringOpen, setDuringOpen] = useState(false);
  const [afterOpen, setAfterOpen] = useState(false);

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
        if (active) setPayload(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [spine.date, spine.mode, spine.sport, spine.tz]);

  useEffect(() => {
    if (!flashLegId) return;
    const timer = window.setTimeout(() => setFlashLegId(null), 650);
    return () => window.clearTimeout(timer);
  }, [flashLegId]);

  const boardRows = useMemo(() => toBoardRows(payload), [payload]);
  const mode = payload?.mode ?? 'demo';

  const intel = useMemo(
    () =>
      computeSlipIntelligence(
        slip.map((leg) => ({
          id: leg.id,
          player: leg.player,
          marketType: leg.marketType,
          line: leg.line,
          odds: leg.odds,
          game: leg.game,
        })),
      ),
    [slip],
  );

  const correlationLabel = intel.correlationScore >= 65 ? 'high' : intel.correlationScore >= 35 ? 'med' : 'low';

  const traceId = spine.trace_id || latestTraceId || undefined;
  const stressHref = appendQuery(nervous.toHref('/stress-test', { ...spine, trace_id: traceId }), {});
  const buildHref = appendQuery(nervous.toHref('/stress-test', { ...spine }), { tab: 'slip' });

  return (
    <section className="space-y-4" aria-label="home-landing-v3">
      <header className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">ResearchBets</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Find the weakest leg before you place it.</h1>
        <p className="mt-1.5 text-sm text-slate-300">Build from tonight&apos;s board, run Stress Test, and review the loop.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <BoardMini
          rows={boardRows}
          loading={loading}
          modeCopy={MODE_COPY[mode]}
          onAddLeg={(row) => {
            addLeg(toLeg(row));
            setFlashLegId(row.id);
          }}
        />

        <div className="space-y-3">
          <QuickSlipRailMini
            slip={slip}
            weakestLeg={weakestLegLabel(slip)}
            correlationLabel={correlationLabel}
            fragility={intel.fragilityScore}
            flashLegId={flashLegId}
            onUpdateLeg={updateLeg}
            onRemoveLeg={removeLeg}
            stressHref={stressHref}
            buildHref={buildHref}
          />
          <RunPulseStrip traceId={traceId} spine={spine} />
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-3 sm:p-4" aria-label="loop-previews">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          aria-expanded={duringOpen}
          onClick={() => setDuringOpen((prev) => !prev)}
        >
          <span>What you&apos;ll see DURING</span>
          <span aria-hidden>{duringOpen ? '▾' : '▸'}</span>
        </button>
        {duringOpen ? <DuringPreviewMini /> : null}

        <button
          type="button"
          className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          aria-expanded={afterOpen}
          onClick={() => setAfterOpen((prev) => !prev)}
        >
          <span>AFTER preview</span>
          <span aria-hidden>{afterOpen ? '▾' : '▸'}</span>
        </button>
        {afterOpen ? <AfterPreviewMini /> : null}
      </section>
    </section>
  );
}
