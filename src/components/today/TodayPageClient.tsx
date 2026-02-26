'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload, TodayPropKey } from '@/src/core/today/types';
import type { NormalizedToday } from '@/src/core/today/normalize';

import { TopSpotsPanel } from './TopSpotsPanel';
import { TodayHeader } from './TodayHeader';
import type { LeagueFilter } from './types';
import { ThinkingTracker } from '@/src/components/trace/ThinkingTracker';
import { BoardTerminalTable, sortBoardRows, type SortKey, type TerminalBoardRow } from './BoardTerminalTable';
import { SlipDrawer } from './SlipDrawer';

const FILTERS: LeagueFilter[] = ['All', 'NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'];

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  return `${minutes} min ago`;
};

function normalizedToTodayPayload(normalized: NormalizedToday): TodayPayload {
  const games = normalized.games.map((game) => {
    const propsPreview: TodayPropKey[] = normalized.board
      .filter((row) => row.gameId === game.id)
      .map((row) => ({
        id: row.id,
        player: row.player,
        market: row.market,
        line: row.line,
        odds: row.odds,
        hitRateL10: row.hitRateL10,
        hitRateL5: row.hitRateL5,
        marketImpliedProb: row.marketImpliedProb,
        modelProb: row.modelProb,
        edgeDelta: row.edgeDelta,
        riskTag: row.riskTag,
        confidencePct: row.confidencePct,
        rationale: ['Edge normalized from canonical BoardRow', row.source ?? 'deterministic'],
        provenance: row.source ?? 'normalized_board',
        lastUpdated: new Date().toISOString()
      }));

    return {
      id: game.id,
      league: 'NBA',
      status: 'upcoming',
      startTime: game.startTime,
      matchup: game.matchup,
      teams: game.matchup.split('@').map((v) => v.trim()),
      bookContext: 'Unified board resolver',
      propsPreview,
      provenance: 'normalized_board',
      lastUpdated: new Date().toISOString()
    } as TodayPayload['games'][number];
  });

  return {
    mode: normalized.mode,
    generatedAt: new Date().toISOString(),
    leagues: ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'],
    games,
    reason: normalized.reason
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

  const filteredGames = useMemo(() => payload.games.filter((game) => league === 'All' || game.league === league), [payload.games, league]);
  const allRows = useMemo<TerminalBoardRow[]>(() => filteredGames.flatMap((game) => game.propsPreview.map((prop) => ({
    id: prop.id,
    gameId: game.id,
    matchup: game.matchup,
    startTime: game.startTime,
    player: prop.player,
    market: prop.market,
    line: prop.line,
    odds: prop.odds,
    hitRateL10: prop.hitRateL10,
    marketImpliedProb: prop.marketImpliedProb,
    modelProb: prop.modelProb,
    edgeDelta: prop.edgeDelta,
    riskTag: prop.riskTag
  }))), [filteredGames]);

  const availableMarkets = useMemo(() => ['all', ...Array.from(new Set(allRows.map((row) => row.market)))], [allRows]);
  const availableTeams = useMemo(() => ['all', ...Array.from(new Set(filteredGames.flatMap((game) => game.teams)))], [filteredGames]);

  const visibleRows = useMemo(() => {
    const filtered = allRows.filter((row) => {
      if (marketFilter !== 'all' && row.market !== marketFilter) return false;
      if (riskFilter !== 'all' && row.riskTag !== riskFilter) return false;
      if (teamFilter !== 'all' && !row.matchup.includes(teamFilter)) return false;
      return true;
    });
    return sortBoardRows(filtered, sortKey);
  }, [allRows, marketFilter, riskFilter, sortKey, teamFilter]);

  const topSpotScouts = useMemo(
    () => [...visibleRows].slice(0, 5).map((row) => filteredGames.flatMap((game) => game.propsPreview).find((prop) => prop.id === row.id)).filter((row): row is TodayPropKey => Boolean(row)),
    [filteredGames, visibleRows]
  );

  const onToggleLeg = (row: TerminalBoardRow) => {
    setSelectedLegs((prev) => {
      const exists = prev.some((leg) => leg.id === row.id);
      if (exists) return prev.filter((leg) => leg.id !== row.id);
      if (prev.length >= 3) return [...prev.slice(1), {
        id: row.id,
        player: row.player,
        marketType: row.market,
        line: row.line ?? 'TBD',
        odds: row.odds,
        volatility: row.riskTag === 'stable' ? 'low' : 'high',
        game: row.matchup
      }];
      return [...prev, {
        id: row.id,
        player: row.player,
        marketType: row.market,
        line: row.line ?? 'TBD',
        odds: row.odds,
        volatility: row.riskTag === 'stable' ? 'low' : 'high',
        game: row.matchup
      }];
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
    <section className="w-full space-y-3 pb-20">
      <TodayHeader
        leagues={FILTERS}
        activeLeague={league}
        onLeagueChange={setLeague}
        onRefresh={() => void loadToday(true)}
        freshness={timeAgo(payload.generatedAt)}
        mode={payload.mode}
      />
      <ThinkingTracker compact traceId={nervous.trace_id} mode={payload.mode} seedHint={`${nervous.sport}:${nervous.date}:${nervous.tz}`} />
      {payload.mode === 'demo' ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">
          Demo mode (live feeds off). Showing deterministic slate.
        </p>
      ) : null}
      <section className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="text-slate-400">Sort</label>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="rounded border border-white/20 bg-slate-900 px-2 py-1" data-testid="sort-select">
            <option value="edge">EDGE</option>
            <option value="l10">L10</option>
            <option value="risk">Risk</option>
            <option value="start">Start time</option>
          </select>
          <label className="text-slate-400">Market</label>
          <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)} className="rounded border border-white/20 bg-slate-900 px-2 py-1">
            {availableMarkets.map((market) => <option key={market} value={market}>{market}</option>)}
          </select>
          <label className="text-slate-400">Risk</label>
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | 'stable' | 'watch')} className="rounded border border-white/20 bg-slate-900 px-2 py-1">
            <option value="all">all</option>
            <option value="stable">stable</option>
            <option value="watch">watch</option>
          </select>
          <label className="text-slate-400">Team</label>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="rounded border border-white/20 bg-slate-900 px-2 py-1">
            {availableTeams.map((team) => <option key={team} value={team}>{team}</option>)}
          </select>
        </div>
      </section>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <BoardTerminalTable rows={visibleRows} onToggleLeg={onToggleLeg} selectedLegIds={selectedLegIds} highlightedRowId={highlightedRowId} />
          <TopSpotsPanel scouts={topSpotScouts} onSelect={onSelectSignal} />
        </div>
        <SlipDrawer
          legs={selectedLegs}
          onRemove={(id) => setSelectedLegs((prev) => prev.filter((leg) => leg.id !== id))}
          onRunStressTest={runStress}
        />
      </div>
    </section>
  );
}
