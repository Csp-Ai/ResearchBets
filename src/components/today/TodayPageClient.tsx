'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { readDraftLegs, upsertDraftLeg } from '@/src/core/slips/draftStorage';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload } from '@/src/core/today/types';

import { GamesSection } from './GamesSection';
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

  const loadToday = useCallback(async (refresh = false) => {
    try {
      const response = await fetch(`/api/today${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('fetch_failed');
      const next = await response.json() as TodayPayload;
      setPayload(next);
    } catch {
      setPayload(createDemoTodayPayload());
    }
  }, []);

  useEffect(() => {
    if (!initialPayload) {
      void loadToday(false);
    }
  }, [initialPayload, loadToday]);

  const filteredGames = useMemo(() => payload.games.filter((game) => league === 'All' || game.league === league), [payload.games, league]);
  const liveGames = filteredGames.filter((game) => game.status === 'live');
  const upcomingGames = filteredGames.filter((game) => game.status === 'upcoming');

  const onAddToDraft = (leg: SlipBuilderLeg) => {
    upsertDraftLeg(leg);
  };

  const onAnalyze = (leg: SlipBuilderLeg) => {
    if (typeof window === 'undefined') return;
    const legs = upsertDraftLeg(leg);
    const prefillText = serializeDraftSlip(legs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(`/stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY)}`);
  };

  const openScout = () => router.push('/slip');

  const analyzeDraft = () => {
    if (typeof window === 'undefined') return;
    const legs = readDraftLegs();
    const prefillText = serializeDraftSlip(legs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(`/stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY)}`);
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-3 pb-20 sm:space-y-4">
      <TodayHeader
        leagues={FILTERS}
        activeLeague={league}
        onLeagueChange={setLeague}
        onRefresh={() => void loadToday(true)}
        freshness={timeAgo(payload.generatedAt)}
        mode={payload.mode}
      />
      {payload.mode === 'demo' ? <p className="text-xs text-amber-200">Demo mode: live providers unavailable. Showing deterministic slate.</p> : null}
      <GamesSection title="Live now" games={liveGames} mode={payload.mode} onAdd={onAddToDraft} onAnalyze={onAnalyze} onOpenScout={openScout} />
      <GamesSection title="Upcoming" games={upcomingGames} mode={payload.mode} onAdd={onAddToDraft} onAnalyze={onAnalyze} onOpenScout={openScout} />
      <button type="button" onClick={analyzeDraft} className="fixed bottom-20 right-4 z-40 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg sm:hidden">
        Stress Test
      </button>
    </section>
  );
}
