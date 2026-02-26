'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { upsertDraftLeg } from '@/src/core/slips/draftStorage';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload } from '@/src/core/today/types';

import { GamesSection } from './GamesSection';
import { TopSpotsPanel } from './TopSpotsPanel';
import { TodayHeader } from './TodayHeader';
import type { LeagueFilter } from './types';

const FILTERS: LeagueFilter[] = ['All', 'NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'];

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  return `${minutes} min ago`;
};

export function TodayPageClient({ initialPayload }: { initialPayload?: TodayPayload }) {
  const router = useRouter();
  const [payload, setPayload] = useState<TodayPayload>(initialPayload ?? createDemoTodayPayload());
  const [league, setLeague] = useState<LeagueFilter>('All');
  const nervous = useNervousSystem();

  const loadToday = useCallback(async (refresh = false) => {
    try {
      const response = await fetch(`/api/today?${new URLSearchParams({ refresh: refresh ? '1' : '0', sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode }).toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('fetch_failed');
      const next = await response.json() as TodayPayload;
      setPayload(next);
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
  const liveGames = filteredGames.filter((game) => game.status === 'live');
  const upcomingGames = filteredGames.filter((game) => game.status === 'upcoming');
  const topSpotScouts = (filteredGames.flatMap((game) => game.propsPreview).slice(0, 4).length > 0
    ? filteredGames.flatMap((game) => game.propsPreview).slice(0, 4)
    : payload.games.flatMap((game) => game.propsPreview).slice(0, 4));
  const fallbackUpcomingScouts = topSpotScouts.slice(2, 4).length > 0 ? topSpotScouts.slice(2, 4) : topSpotScouts.slice(0, 2);
  const denseLayout = filteredGames.length < 2;

  const onAddToDraft = (leg: SlipBuilderLeg) => {
    upsertDraftLeg(leg);
  };

  const onAnalyze = (leg: SlipBuilderLeg) => {
    if (typeof window === 'undefined') return;
    const legs = upsertDraftLeg(leg);
    const prefillText = serializeDraftSlip(legs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(nervous.toHref('/stress-test', { tab: 'analyze', prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY }));
  };

  const openScout = () => router.push(nervous.toHref('/slip'));

  return (
    <section className="w-full space-y-4 pb-20 sm:space-y-5">
      <TodayHeader
        leagues={FILTERS}
        activeLeague={league}
        onLeagueChange={setLeague}
        onRefresh={() => void loadToday(true)}
        freshness={timeAgo(payload.generatedAt)}
        mode={payload.mode}
      />
      {payload.mode === 'demo' ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          Demo mode: live providers unavailable. Showing deterministic slate.
        </p>
      ) : null}
      <div className={denseLayout ? 'grid gap-2 lg:grid-cols-2' : 'grid gap-4 lg:grid-cols-2'}>
        <GamesSection title="Live now" games={liveGames} mode={payload.mode} onAdd={onAddToDraft} onAnalyze={onAnalyze} onOpenScout={openScout} dense={denseLayout} />
        {upcomingGames.length > 0 ? (
          <GamesSection title="Upcoming" games={upcomingGames} mode={payload.mode} onAdd={onAddToDraft} onAnalyze={onAnalyze} onOpenScout={openScout} dense={denseLayout} />
        ) : (
          <TopSpotsPanel scouts={fallbackUpcomingScouts} />
        )}
      </div>
    </section>
  );
}
