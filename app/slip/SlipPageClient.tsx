'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { GamesToday, mapPropToLeg, type TodayGame } from '@/features/dashboard/GamesToday';
import { SlipBuilder, type SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { createTrackingFromDraft, saveSlip } from '@/src/core/slips/storage';
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

function getScoutDraftLegs(games: TodayGame[]): SlipBuilderLeg[] {
  const seeded: SlipBuilderLeg[] = [];
  for (const game of games) {
    for (const team of game.teams) {
      for (const player of team.players) {
        for (const prop of player.props) {
          seeded.push(mapPropToLeg(player.name, prop, game.matchup));
          if (seeded.length === 2) return seeded;
        }
      }
    }
  }
  return seeded;
}

export default function SlipPageClient() {
  const { slip, addLeg, removeLeg, clearSlip, setSlip } = useDraftSlip();
  const [games, setGames] = useState<TodayGame[]>([]);
  const [boardMode, setBoardMode] = useState<'live' | 'cache' | 'demo'>('demo');
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle');
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
      .then((payload: { ok?: boolean; data?: { mode: 'live'|'cache'|'demo'; games: Array<{id:string;matchup:string;startTime:string}>; board: Array<{id:string;gameId:string;player:string;market:string;line:string;odds?:string}> } } | null) => {
        if (!payload?.ok || !payload.data) return;
        const data = payload.data;
        setBoardMode(data.mode);
        const asTodayPayload: TodayPayload = { mode: data.mode, generatedAt: new Date().toISOString(), leagues: ['NBA','NFL','MLB','Soccer','UFC','NHL'], games: data.games.map((g) => ({ id: g.id, league: 'NBA', status: 'upcoming', startTime: g.startTime, matchup: g.matchup, teams: g.matchup.split('@').map((v) => v.trim()), bookContext: 'Unified board resolver', provenance: 'normalized_board', lastUpdated: new Date().toISOString(), propsPreview: data.board.filter((b) => b.gameId === g.id).map((b) => ({ id: b.id, player: b.player, market: b.market as TodayPayload['games'][number]['propsPreview'][number]['market'], line: b.line, odds: b.odds, rationale: ['Board signal'], provenance: 'normalized_board', lastUpdated: new Date().toISOString() })) })) };
        const mappedGames = mapTodayPayload(asTodayPayload);
        setGames(mappedGames);
        if (dedupedLegs.length === 0) {
          const seeded = getScoutDraftLegs(mappedGames);
          if (seeded.length > 0) setSlip(seeded);
        }
      })
      .catch(() => undefined);
  }, [dedupedLegs.length, nervous, nervous.sport, nervous.date, nervous.tz, nervous.mode, setSlip]);

  const onAnalyzeSlip = () => {
    if (dedupedLegs.length === 0 || typeof window === 'undefined') return;
    const prefillText = serializeDraftSlip(dedupedLegs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(appendQuery(nervous.toHref('/research'), { tab: 'analyze', prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY }));
  };


  const onTrackSlip = () => {
    if (dedupedLegs.length === 0) return;
    const tracking = createTrackingFromDraft(dedupedLegs, boardMode);
    saveSlip(tracking);
    router.push(appendQuery(nervous.toHref('/track'), { slipId: tracking.slipId }));
  };

  const onCopyLegs = async () => {
    if (typeof window === 'undefined' || dedupedLegs.length === 0) return;
    const copyLines = dedupedLegs.map((leg, index) => `${index + 1}. ${leg.player} ${leg.marketType} ${leg.line}${leg.odds ? ` (${leg.odds})` : ''}`);
    try {
      await navigator.clipboard.writeText(copyLines.join('\n'));
      setCopyState('done');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  const moveLeg = (from: number, to: number) => {
    if (to < 0 || to >= dedupedLegs.length) return;
    const next = [...dedupedLegs];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setSlip(next);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Draft Slip</h1>
        <p className="text-sm text-slate-300">Bar-ready flow: add legs from Tonight&apos;s Board, remove quickly, copy list into your book, then analyze weakest-leg risk.</p>
        <p className="text-xs text-slate-500">Board mode: {boardMode} • Context locked to {nervous.sport} / {nervous.date} / {nervous.tz}</p>
      </header>
      <SlipIntelBar legs={dedupedLegs} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <GamesToday games={games} onAddLeg={addLeg} />
        </div>
        <div className="xl:sticky xl:top-4 xl:h-fit space-y-3">
          <section className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-cyan-100">Draft Slip</h2>
              <span className="text-xs text-slate-400">{dedupedLegs.length} legs</span>
            </div>
            <p className="text-xs text-slate-400">No paste required: seeded with deterministic board scouts. Reorder/remove then copy into FanDuel manually.</p>
            <ul className="space-y-2">
              {dedupedLegs.map((leg, index) => (
                <li key={leg.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{index + 1}. {leg.player} {leg.marketType} {leg.line} {leg.odds ?? ''}</p>
                    <button type="button" className="rounded border border-rose-500/50 px-2 py-1 text-[11px] text-rose-100" onClick={() => removeLeg(leg.id)}>Remove</button>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button type="button" className="rounded border border-slate-600 px-2 py-0.5 text-[11px] disabled:opacity-40" onClick={() => moveLeg(index, index - 1)} disabled={index === 0}>↑</button>
                    <button type="button" className="rounded border border-slate-600 px-2 py-0.5 text-[11px] disabled:opacity-40" onClick={() => moveLeg(index, index + 1)} disabled={index === dedupedLegs.length - 1}>↓</button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="w-full rounded-lg border border-slate-500/70 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-40" onClick={onCopyLegs} disabled={dedupedLegs.length === 0}>Copy legs {copyState === 'done' ? '✓' : copyState === 'error' ? '(copy unavailable in this browser)' : ''}</button>
          </section>
          <SlipBuilder legs={dedupedLegs} onLegsChange={(nextLegs) => {
            if (nextLegs.length === 0) {
              clearSlip();
              return;
            }
            setSlip(nextLegs);
          }} />
          <div className="grid grid-cols-1 gap-2">
            <button type="button" className="w-full rounded-xl border border-emerald-300/80 bg-emerald-500/20 px-4 py-3 text-base font-semibold text-emerald-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={onTrackSlip} disabled={dedupedLegs.length === 0}>Track slip ({dedupedLegs.length})</button>
            <button type="button" className="w-full rounded-xl border border-cyan-400/70 bg-cyan-500/10 px-4 py-3 text-base font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40" onClick={onAnalyzeSlip} disabled={dedupedLegs.length === 0}>Analyze now ({dedupedLegs.length})</button>
          </div>
        </div>
      </div>
    </section>
  );
}
