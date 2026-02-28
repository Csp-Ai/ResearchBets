'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload } from '@/src/core/today/types';
import { buildCanonicalBoard, buildTopSpotScouts } from '@/src/core/today/boardModel';
import type { NormalizedToday } from '@/src/core/today/normalize';

import { TopSpotsPanel } from './TopSpotsPanel';
import type { LeagueFilter } from './types';
import { BoardTerminalTable, sortBoardRows, type SortKey, type TerminalBoardRow } from './BoardTerminalTable';
import { SlipDrawer } from './SlipDrawer';
import { TruthSpineHeader } from '@/src/components/ui/TruthSpineHeader';
import { appendQuery } from '@/src/components/landing/navigation';

const FILTERS: LeagueFilter[] = ['All', 'NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'];

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  return `${minutes} min ago`;
};

function normalizedToTodayPayload(normalized: NormalizedToday): TodayPayload {
  const demo = createDemoTodayPayload();
  return {
    ...demo,
    mode: normalized.mode,
    generatedAt: normalized.generatedAt ?? demo.generatedAt,
    reason: normalized.reason,
    provenance: normalized.provenance,
    status: normalized.status,
    nextAvailableStartTime: normalized.nextAvailableStartTime,
    providerHealth: normalized.providerHealth as TodayPayload['providerHealth'],
    games: demo.games,
    board: normalized.board
  };
}

export function TodayPageClient({ initialPayload }: { initialPayload?: TodayPayload }) {
  const router = useRouter();
  const [payload, setPayload] = useState<TodayPayload>(initialPayload ?? createDemoTodayPayload());
  const [league, setLeague] = useState<LeagueFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('edge');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'stable' | 'watch'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedLegs, setSelectedLegs] = useState<SlipBuilderLeg[]>([]);
  const [highlightedRowId, setHighlightedRowId] = useState<string | undefined>(undefined);
  const [recentAddedRowId, setRecentAddedRowId] = useState<string | null>(null);
  const nervous = useNervousSystem();

  const loadToday = useCallback(async (refresh = false) => {
    try {
      const response = await fetch(`/api/today?${new URLSearchParams({ refresh: refresh ? '1' : '0', sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode }).toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('fetch_failed');
      const next = await response.json() as { ok?: boolean; data?: NormalizedToday };
      if (!next.ok || !next.data) throw new Error('bad_envelope');
      setPayload(normalizedToTodayPayload(next.data));
    } catch {
      setPayload(createDemoTodayPayload());
    }
  }, [nervous.date, nervous.mode, nervous.sport, nervous.tz]);

  useEffect(() => {
    if (!initialPayload) {
      void loadToday(false);
    }
  }, [initialPayload, loadToday]);

  const allRows = useMemo<TerminalBoardRow[]>(() => buildCanonicalBoard(payload).map((row) => ({
    id: row.id,
    gameId: row.gameId,
    matchup: row.matchup,
    startTime: row.startTime,
    player: row.player,
    market: row.market,
    line: row.line,
    odds: row.odds,
    hitRateL10: row.hitRateL10,
    marketImpliedProb: row.marketImpliedProb,
    modelProb: row.modelProb,
    edgeDelta: row.edgeDelta,
    riskTag: row.riskTag
  })), [payload]);

  const filteredRows = useMemo(() => allRows.filter((row) => {
    if (league === 'All') return true;
    return row.id.toUpperCase().includes(`:${league}:`) || row.matchup.toUpperCase().includes(league);
  }), [allRows, league]);

  const availableMarkets = useMemo(() => ['all', ...Array.from(new Set(filteredRows.map((row) => row.market)))], [filteredRows]);
  const availableTeams = useMemo(() => ['all', ...Array.from(new Set(filteredRows.flatMap((row) => row.matchup.split('@').map((part) => part.trim()))))], [filteredRows]);

  const visibleRows = useMemo(() => {
    const filtered = filteredRows.filter((row) => {
      if (marketFilter !== 'all' && row.market !== marketFilter) return false;
      if (riskFilter !== 'all' && row.riskTag !== riskFilter) return false;
      if (teamFilter !== 'all' && !row.matchup.includes(teamFilter)) return false;
      return true;
    });
    return sortBoardRows(filtered, sortKey);
  }, [filteredRows, marketFilter, riskFilter, sortKey, teamFilter]);

  const topSpotScouts = useMemo(() => buildTopSpotScouts(payload).map((row) => ({ ...row, rationale: row.rationale ?? ['Canonical board signal'], provenance: row.provenance ?? 'today.board', lastUpdated: row.lastUpdated ?? payload.generatedAt })), [payload]);

  const onToggleLeg = (row: TerminalBoardRow) => {
    setSelectedLegs((prev) => {
      const exists = prev.some((leg) => leg.id === row.id);
      if (exists) return prev.filter((leg) => leg.id !== row.id);
      setRecentAddedRowId(row.id);
      window.setTimeout(() => setRecentAddedRowId(null), 700);
      if (prev.length >= 3) return [...prev.slice(1), { id: row.id, player: row.player, marketType: row.market, line: row.line ?? 'TBD', odds: row.odds, volatility: row.riskTag === 'stable' ? 'low' : 'high', game: row.matchup }];
      return [...prev, { id: row.id, player: row.player, marketType: row.market, line: row.line ?? 'TBD', odds: row.odds, volatility: row.riskTag === 'stable' ? 'low' : 'high', game: row.matchup }];
    });
  };

  const runStress = () => {
    if (typeof window === 'undefined') return;
    const prefillText = serializeDraftSlip(selectedLegs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(nervous.toHref('/stress-test', { tab: 'analyze', prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY }));
  };

  const onSelectSignal = (id: string) => {
    setHighlightedRowId(id);
    if (typeof window === 'undefined') return;
    document.getElementById(`board-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const selectedLegIds = useMemo(() => new Set(selectedLegs.map((leg) => leg.id)), [selectedLegs]);

  return (
    <section className="w-full space-y-3 pb-14">
      <TruthSpineHeader
        title="Board"
        subtitle="Before loop: scout leads, check risk, and stage a slip."
        freshness={timeAgo(payload.generatedAt)}
        actions={[
          { label: 'Build from Board', href: nervous.toHref('/slip'), tone: 'primary' },
          { label: 'Try sample slip', href: appendQuery(nervous.toHref('/slip'), { sample: '1' }) },
          { label: 'Track', href: nervous.toHref('/track') }
        ]}
      />
      <section className="panel-shell p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {FILTERS.map((item) => (
            <button key={item} type="button" onClick={() => setLeague(item)} className={`terminal-focus rounded-md border px-3 py-1 transition ${league === item ? 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100' : 'border-transparent text-slate-400 hover:border-white/15 hover:text-slate-200'}`}>{item}</button>
          ))}
          <span className="ml-auto text-slate-500 mono-number">{payload.mode} · {timeAgo(payload.generatedAt)}</span>
        </div>
      </section>
      <section id="board-terminal" className="panel-shell p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="terminal-focus rounded-md border border-white/15 bg-slate-900/80 px-2 py-1" data-testid="sort-select"><option value="edge">Edge</option><option value="l10">L10</option><option value="risk">Risk</option><option value="start">Start</option></select>
          <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)} className="terminal-focus rounded-md border border-white/15 bg-slate-900/80 px-2 py-1">{availableMarkets.map((market) => <option key={market} value={market}>{market}</option>)}</select>
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | 'stable' | 'watch')} className="terminal-focus rounded-md border border-white/15 bg-slate-900/80 px-2 py-1"><option value="all">all risk</option><option value="stable">stable</option><option value="watch">watch</option></select>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="terminal-focus rounded-md border border-white/15 bg-slate-900/80 px-2 py-1">{availableTeams.map((team) => <option key={team} value={team}>{team}</option>)}</select>
        </div>
      </section>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <section className="panel-shell p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-cyan-100">Board → Ticket</span>
              <span className={`mono-number rounded-full border px-2 py-1 transition-all ${recentAddedRowId ? 'scale-105 border-emerald-300/60 bg-emerald-500/10 text-emerald-100' : 'border-white/15 bg-slate-900/70 text-slate-200'}`}>{selectedLegs.length} legs staged</span>
              {selectedLegs.length > 0 ? <p className="text-slate-300">Ready to analyze or track this ticket.</p> : <p className="text-slate-400">Add 2–3 board signals to build a ticket.</p>}
              {selectedLegs.length >= 3 ? <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-1 text-amber-100">Guardrail cue: keep exposure concentrated</span> : null}
            </div>
          </section>
          <BoardTerminalTable rows={visibleRows} onToggleLeg={onToggleLeg} selectedLegIds={selectedLegIds} highlightedRowId={highlightedRowId} recentAddedRowId={recentAddedRowId} />
          <TopSpotsPanel scouts={topSpotScouts} onSelect={onSelectSignal} />
        </div>
        <SlipDrawer legs={selectedLegs} onRemove={(id) => setSelectedLegs((prev) => prev.filter((leg) => leg.id !== id))} onRunStressTest={runStress} />
      </div>
    </section>
  );
}
