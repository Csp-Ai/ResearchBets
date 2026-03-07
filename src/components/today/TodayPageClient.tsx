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
import { deriveEvidenceTexture } from '@/src/core/today/evidenceTexture';
import type { NormalizedToday } from '@/src/core/today/normalize';

import { TopSpotsPanel } from './TopSpotsPanel';
import type { LeagueFilter } from './types';
import { BoardTerminalTable, sortBoardRows, type SortKey, type TerminalBoardRow } from './BoardTerminalTable';
import { SlipDrawer } from './SlipDrawer';
import { TruthSpineHeader } from '@/src/components/ui/TruthSpineHeader';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { appendQuery } from '@/src/components/landing/navigation';
import { FEATURED_STAT_CATEGORY_ORDER, FEATURED_STAT_LABEL, type FeaturedStatCategory, mapMarketToFeaturedStatCategory } from '@/src/core/markets/statCategory';
import { buildTodayRuntimeSummary } from '@/src/core/ui/truthPresentation';

const FILTERS: LeagueFilter[] = ['All', 'NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'];

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
  const [isLoading, setIsLoading] = useState(!initialPayload);
  const [league, setLeague] = useState<LeagueFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('edge');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'stable' | 'watch'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<'grouped'|'all'>('grouped');
  const [selectedLegs, setSelectedLegs] = useState<SlipBuilderLeg[]>([]);
  const [highlightedRowId, setHighlightedRowId] = useState<string | undefined>(undefined);
  const [recentAddedRowId, setRecentAddedRowId] = useState<string | null>(null);
  const nervous = useNervousSystem();

  const loadToday = useCallback(async (refresh = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/today?${new URLSearchParams({ refresh: refresh ? '1' : '0', sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode }).toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('fetch_failed');
      const next = await response.json() as { ok?: boolean; data?: NormalizedToday };
      if (!next.ok || !next.data) throw new Error('bad_envelope');
      setPayload(normalizedToTodayPayload(next.data));
    } catch {
      setPayload(createDemoTodayPayload());
    } finally {
      setIsLoading(false);
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
    riskTag: row.riskTag,
    minutesL1: row.minutesL1,
    minutesL3Avg: row.minutesL3Avg,
    minutesSource: row.minutesSource,
    l5Avg: row.l5Avg,
    l5Source: row.l5Source,
    threesAttL5Avg: row.threesAttL5Avg,
    attemptsSource: row.attemptsSource,
    roleConfidence: row.roleConfidence,
    roleReasons: row.roleReasons,
    deadLegRisk: row.deadLegRisk,
    deadLegReasons: row.deadLegReasons,
    rationale: row.rationale
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

  const groupedRows = useMemo(() => {
    const grouped = new Map<string, {
      gameId: string;
      matchup: string;
      startTime: string;
      categories: Record<FeaturedStatCategory, TerminalBoardRow[]>;
    }>();

    for (const row of visibleRows) {
      const category = mapMarketToFeaturedStatCategory(row.market);
      if (!category) continue;
      const existing = grouped.get(row.gameId) ?? {
        gameId: row.gameId,
        matchup: row.matchup,
        startTime: row.startTime,
        categories: {
          pra: [],
          points: [],
          rebounds: [],
          assists: [],
          threes: []
        }
      };
      existing.categories[category].push(row);
      grouped.set(row.gameId, existing);
    }

    return [...grouped.values()]
      .map((game) => ({
        ...game,
        categories: FEATURED_STAT_CATEGORY_ORDER.reduce((acc, category) => {
          acc[category] = game.categories[category].slice(0, 2);
          return acc;
        }, { pra: [], points: [], rebounds: [], assists: [], threes: [] } as Record<FeaturedStatCategory, TerminalBoardRow[]>)
      }))
      .filter((game) => FEATURED_STAT_CATEGORY_ORDER.some((category) => game.categories[category].length > 0));
  }, [visibleRows]);

  const topSpotScouts = useMemo(() => buildTopSpotScouts(payload).map((row) => ({ ...row, rationale: row.rationale ?? ['Canonical board signal'], provenance: row.provenance ?? 'today.board', lastUpdated: row.lastUpdated ?? payload.generatedAt })), [payload]);

  const onToggleLeg = (row: TerminalBoardRow) => {
    setSelectedLegs((prev) => {
      const exists = prev.some((leg) => leg.id === row.id);
      if (exists) return prev.filter((leg) => leg.id !== row.id);
      setRecentAddedRowId(row.id);
      window.setTimeout(() => setRecentAddedRowId(null), 700);
      const nextLeg: SlipBuilderLeg = { id: row.id, player: row.player, marketType: row.market, line: row.line ?? 'TBD', odds: row.odds, volatility: row.riskTag === 'stable' ? 'low' : 'high', game: row.matchup, deadLegRisk: row.deadLegRisk, deadLegReasons: row.deadLegReasons };
      if (prev.length >= 3) return [...prev.slice(1), nextLeg];
      return [...prev, nextLeg];
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


  const rationaleByLegId = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const row of allRows) {
      const evidence = deriveEvidenceTexture(row);
      const coreReason = row.rationale?.[0] ?? 'No explicit rationale; staged from ranked board signal.';
      const carry = [coreReason];
      if (evidence.strongestEvidence) carry.push(`Support: ${evidence.strongestEvidence}`);
      if (evidence.caution) carry.push(`Fragility: ${evidence.caution}`);
      lookup.set(row.id, carry.join(' | '));
    }
    return lookup;
  }, [allRows]);

  const selectedLegIds = useMemo(() => new Set(selectedLegs.map((leg) => leg.id)), [selectedLegs]);
  const runtimeSummary = useMemo(() => buildTodayRuntimeSummary({
    mode: payload.mode,
    reason: payload.provenance?.reason ?? payload.reason,
    degradedReason: payload.provenance?.reason,
    generatedAt: payload.generatedAt,
    intentMode: nervous.mode
  }), [nervous.mode, payload.generatedAt, payload.mode, payload.provenance?.reason, payload.reason]);

  return (
    <section className="w-full space-y-3 pb-14">
      <TruthSpineHeader
        title="Board"
        subtitle="Scan matchup → prop → edge reason, then stage a ticket."
        freshness={runtimeSummary.freshnessLabel}
        runtimeSummary={runtimeSummary}
        actions={[
          { label: selectedLegs.length > 0 ? 'Analyze staged ticket' : 'Build from board', href: selectedLegs.length > 0 ? nervous.toHref('/stress-test', { tab: 'analyze' }) : '#board-terminal', tone: 'primary' },
          { label: 'Try sample slip', href: appendQuery(nervous.toHref('/slip'), { sample: '1' }) },
          { label: 'Track', href: nervous.toHref('/track') }
        ]}
      />
      <section className="panel-shell p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {FILTERS.map((item) => (
            <button key={item} type="button" onClick={() => setLeague(item)} className={`terminal-focus rounded-md border px-3 py-1 transition ${league === item ? 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100' : 'border-transparent text-slate-400 hover:border-white/15 hover:text-slate-200'}`}>{item}</button>
          ))}
          <span className="rounded border border-white/15 px-2 py-1 text-slate-200" title={runtimeSummary.bannerDetail}>{runtimeSummary.bannerLabel}</span>
          <span className="rounded border border-white/15 px-2 py-1 text-slate-300" title={runtimeSummary.sourceDetail}>{runtimeSummary.sourceLabel}</span>
          <span className="rounded border border-white/15 px-2 py-1 text-slate-400" title={runtimeSummary.freshnessDetail}>Freshness: {runtimeSummary.freshnessLabel}</span>
          {runtimeSummary.fallbackDetail ? <span className="rounded border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-amber-100" title={runtimeSummary.fallbackDetail}>Fallback context</span> : null}
        </div>
      </section>
      <section className="panel-shell p-3">
        <div className="flex items-center gap-2 text-xs">
          <button className={`rounded px-2 py-1 ${viewTab==='grouped'?'bg-cyan-500/15 text-cyan-100':'text-slate-300'}`} onClick={() => setViewTab('grouped')}>Core candidates</button>
          <button className={`rounded px-2 py-1 ${viewTab==='all'?'bg-cyan-500/15 text-cyan-100':'text-slate-300'}`} onClick={() => setViewTab('all')}>All props</button>
          <span className="ml-auto text-slate-500">{visibleRows.length} board rows</span>
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
          {viewTab === 'grouped' ? groupedRows.map((game) => (
            <section key={game.gameId} className="panel-shell p-3" data-testid="grouped-game-section">
              <h3 className="text-sm font-semibold text-slate-100">{game.matchup} · {game.startTime}</h3>
              <div className="mt-2 space-y-2">
                {FEATURED_STAT_CATEGORY_ORDER.map((category) => (
                  game.categories[category].length > 0 ? (
                    <div key={category}>
                      <p className="mb-1 text-[11px] text-cyan-100" data-testid={`category-${category}`}>{FEATURED_STAT_LABEL[category]}</p>
                      <BoardTerminalTable rows={game.categories[category]} onToggleLeg={onToggleLeg} selectedLegIds={selectedLegIds} highlightedRowId={highlightedRowId} recentAddedRowId={recentAddedRowId} />
                    </div>
                  ) : null
                ))}
              </div>
            </section>
          )) : <BoardTerminalTable rows={visibleRows} onToggleLeg={onToggleLeg} selectedLegIds={selectedLegIds} highlightedRowId={highlightedRowId} recentAddedRowId={recentAddedRowId} />}
          <TopSpotsPanel scouts={topSpotScouts} onSelect={onSelectSignal} selectedLegIds={selectedLegIds} />
        </div>
        <SlipDrawer legs={selectedLegs} rationaleByLegId={rationaleByLegId} onRemove={(id) => setSelectedLegs((prev) => prev.filter((leg) => leg.id !== id))} onRunStressTest={runStress} />
      </div>
      {isLoading ? <Skeleton className="h-6 w-full" /> : null}
    </section>
  );
}
