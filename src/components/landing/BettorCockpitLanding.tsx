'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { BelowFoldAccordions } from '@/src/components/landing/accordions/BelowFoldAccordions';
import { SAMPLE_SLATE, SAMPLE_SLIP_IDS } from '@/src/components/landing/sampleSlate';
import { SaveAnalysisModal } from '@/src/components/landing/modals/SaveAnalysisModal';
import { PasteSlipModal } from '@/src/components/landing/modals/PasteSlipModal';
import { TonightsBoard, toSlipLeg, type LandingBoardRow } from '@/src/components/landing/board/TonightsBoard';
import { runStressHeuristic } from '@/src/components/landing/stressTest';
import { DraftTicketPanel } from '@/src/components/landing/ticket/DraftTicketPanel';
import { MobileStickyTicketBar } from '@/src/components/landing/ticket/MobileStickyTicketBar';
import { TicketBottomSheet } from '@/src/components/landing/ticket/TicketBottomSheet';
import { Topbar } from '@/src/components/landing/topbar/Topbar';
import { RunTraceCompact } from '@/src/components/landing/trace/RunTraceCompact';
import { RunTraceStrip } from '@/src/components/landing/trace/RunTraceStrip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { TodayPayload } from '@/src/core/today/types';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

const MODE_COPY = {
  live: 'Live slate',
  cache: 'Using cached slate',
  demo: 'Demo mode (live feeds off)'
} as const;

const toRows = (payload: TodayPayload | null): LandingBoardRow[] => {
  if (!payload) return SAMPLE_SLATE;
  if ((payload.board?.length ?? 0) === 0) return SAMPLE_SLATE;
  return payload.board!.map((row) => ({
    id: row.id,
    gameId: row.gameId,
    matchup: row.matchup ?? row.gameId,
    startTime: row.startTime ?? 'Tonight',
    player: row.player,
    market: row.market,
    line: row.line ?? '',
    odds: row.odds ?? '-110',
    hitRateL10: row.hitRateL10 ?? 55,
    riskTag: row.riskTag ?? 'watch',
  }));
};

export function BettorCockpitLanding() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg, setSlip } = useDraftSlip();
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [stage, setStage] = useState<'Idle' | 'Before' | 'Analyze' | 'During' | 'After' | 'Complete'>('Idle');
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [status, setStatus] = useState('Showing next slate');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const href = appendQuery('/api/today', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode, trace_id: nervous.trace_id });
        const response = await fetch(href, { signal: controller.signal, cache: 'no-store' });
        const payload = (await response.json()) as { data?: TodayPayload };
        const next = payload.data ?? null;
        setToday(next);
        if (!next || (next.board?.length ?? 0) === 0) setStatus('Showing next slate');
        else setStatus(MODE_COPY[next.mode]);
      } catch {
        setToday(null);
        setStatus('Using cached slate');
      }
    };
    void load();
    return () => controller.abort();
  }, [nervous.date, nervous.mode, nervous.sport, nervous.tz, nervous.trace_id]);

  const rows = useMemo(() => toRows(today), [today]);
  const selectedIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const stress = useMemo(() => runStressHeuristic(slip), [slip]);

  const runStress = () => {
    if (slip.length < 2) return;
    setStage('Analyze');
    window.setTimeout(() => setStage('During'), 120);
    window.setTimeout(() => setStage('After'), 240);
    window.setTimeout(() => setStage('Complete'), 360);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100">
      <Topbar modeLabel={status} modeTooltip="Demo mode (live feeds off) preserves deterministic board and ticket behavior." />
      <main className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3">
        <section className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <h1 className="text-2xl font-semibold uppercase">One leg breaks. <span className="text-cyan-300">Find it first.</span></h1>
          <p className="mt-2 text-sm text-slate-300">Board-first workflow with a ticket always within thumb reach.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => document.getElementById('tonights-board')?.scrollIntoView({ behavior: 'smooth' })} className="min-h-11 rounded-md bg-cyan-300 px-3 text-sm font-semibold text-slate-950">Build from Tonight</button>
            <button onClick={() => { const sample = rows.filter((row) => SAMPLE_SLIP_IDS.includes(row.id)).map((row) => toSlipLeg(row)); setSlip(sample); setSheetOpen(true); }} className="min-h-11 rounded-md border border-white/20 px-3 text-sm">Load sample slip</button>
            <button onClick={() => setPasteOpen(true)} className="min-h-11 rounded-md border border-white/20 px-3 text-sm">Paste slip</button>
          </div>
        </section>

        <RunTraceCompact expanded={traceExpanded} onToggle={() => setTraceExpanded((v) => !v)} stage={stage} traceId={nervous.trace_id} />
        <RunTraceStrip stage={stage} traceId={nervous.trace_id} />

        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <TonightsBoard
            rows={rows}
            query={query}
            onQueryChange={setQuery}
            selectedIds={selectedIds}
            onAddLeg={(row) => addLeg(toSlipLeg(row))}
            onRemoveLeg={removeLeg}
          />
          <div className="hidden md:block">
            <DraftTicketPanel slip={slip} onRemoveLeg={removeLeg} onRunStress={runStress} stress={stress} running={stage === 'Analyze'} onSave={() => setSaveOpen(true)} />
          </div>
        </div>

        <BelowFoldAccordions />

        <Link href={appendQuery(nervous.toHref('/today'), { tab: 'board' })} className="text-xs text-cyan-300 underline">Open full board with current spine</Link>
      </main>

      <MobileStickyTicketBar legCount={slip.length} onOpen={() => setSheetOpen(true)} />
      <TicketBottomSheet open={sheetOpen} slip={slip} stress={stress} running={stage === 'Analyze'} onClose={() => setSheetOpen(false)} onRemoveLeg={removeLeg} onRunStress={runStress} onSave={() => setSaveOpen(true)} />
      <PasteSlipModal open={pasteOpen} onClose={() => setPasteOpen(false)} />
      <SaveAnalysisModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}
