'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { GamesToday, type TodayGame } from '@/features/dashboard/GamesToday';
import { SlipBuilder, type SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import type { TodayPayload } from '@/src/core/today/types';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';

function mapTodayPayload(payload: TodayPayload): TodayGame[] {
  return payload.games.map((game) => ({
    id: game.id,
    league: game.league === 'NFL' ? 'NFL' : 'NBA',
    matchup: game.matchup,
    teams: game.teams.map((team, idx) => ({
      team,
      players: game.propsPreview.slice(idx * 2, idx * 2 + 2).map((prop) => ({
        id: `${team}-${prop.id}`,
        name: prop.player,
        injuryStatus: 'Active',
        matchupNotes: prop.rationale[0] ?? 'Board signal',
        props: [{ market: prop.market, line: prop.line ?? '0.5', odds: prop.odds }]
      }))
    }))
  }));
}

export default function SlipPage() {
  const { slip, addLeg, removeLeg, clearSlip } = useDraftSlip();
  const [games, setGames] = useState<TodayGame[]>([]);
  const [boardMode, setBoardMode] = useState<'live' | 'cache' | 'demo'>('demo');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nervous = useNervousSystem();
  const dedupedLegs = useMemo(() => Array.from(new Map(slip.map((leg) => [leg.id, leg])).values()), [slip]);



  useEffect(() => {
    const seedPlayer = searchParams.get('seedPlayer');
    const seedMarket = searchParams.get('seedMarket');
    const seedLine = searchParams.get('seedLine');
    if (!seedPlayer || !seedMarket) return;

    addLeg({
      id: `seed-${searchParams.get('gameId') ?? 'board'}-${searchParams.get('propId') ?? `${seedPlayer}-${seedMarket}-${seedLine ?? '0.5'}`}`,
      player: seedPlayer,
      marketType: seedMarket as SlipBuilderLeg['marketType'],
      line: seedLine ?? '0.5',
      odds: searchParams.get('seedOdds') ?? undefined,
      game: searchParams.get('gameId') ?? undefined
    });
  }, [addLeg, searchParams]);

  useEffect(() => {
    fetch(nervous.toHref('/api/today'))
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: TodayPayload | null) => {
        if (!payload) return;
        setBoardMode(payload.mode);
        setGames(mapTodayPayload(payload));
      })
      .catch(() => undefined);
  }, [nervous, nervous.sport, nervous.date, nervous.tz, nervous.mode]);

  const onAnalyzeSlip = () => {
    if (dedupedLegs.length === 0 || typeof window === 'undefined') return;
    const prefillText = serializeDraftSlip(dedupedLegs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(appendQuery(nervous.toHref('/research'), { tab: 'analyze', prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY }));
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Draft Slip</h1>
        <p className="text-sm text-slate-300">Bar-ready flow: add legs from Tonight&apos;s Board, remove quickly, then analyze in Research.</p>
        <p className="text-xs text-slate-500">Board mode: {boardMode} • Context locked to {nervous.sport} / {nervous.date} / {nervous.tz}</p>
      </header>
      <SlipIntelBar legs={dedupedLegs} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <GamesToday games={games} onAddLeg={addLeg} />
        </div>
        <div className="xl:sticky xl:top-4 xl:h-fit space-y-3">
          <SlipBuilder legs={dedupedLegs} onLegsChange={(nextLegs) => {
            const nextIds = new Set(nextLegs.map((leg) => leg.id));
            if (nextLegs.length === 0) { clearSlip(); return; }
            dedupedLegs.filter((leg) => !nextIds.has(leg.id)).forEach((leg) => removeLeg(leg.id));
          }} />
          <button type="button" className="w-full rounded-xl border border-cyan-400/70 bg-cyan-500/10 px-4 py-3 text-base font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40" onClick={onAnalyzeSlip} disabled={dedupedLegs.length === 0}>Analyze slip in Research ({dedupedLegs.length})</button>
        </div>
      </div>
    </section>
  );
}
