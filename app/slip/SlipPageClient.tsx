'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { GamesToday, mapPropToLeg, type TodayGame } from '@/features/dashboard/GamesToday';
import { SlipBuilder, type SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { createTrackingFromDraft, saveSlip } from '@/src/core/slips/storage';
import type { TodayPayload } from '@/src/core/today/types';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';
import { TruthSpineHeader } from '@/src/components/ui/TruthSpineHeader';
import { AliveEmptyState } from '@/src/components/ui/AliveEmptyState';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Button } from '@/src/components/ui/button';
import { ProBuildPanel } from '@/src/components/slips/ProBuildPanel';
import { Skeleton } from '@/src/components/ui/Skeleton';

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
  const { slip, isHydrated, addLeg, removeLeg, clearSlip, setSlip } = useDraftSlip();
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
        const asTodayPayload: TodayPayload = { mode: data.mode, generatedAt: new Date().toISOString(), leagues: ['NBA','NFL','MLB','Soccer','UFC','NHL'], games: data.games.map((g) => ({ id: g.id, league: 'NBA', status: 'upcoming', startTime: g.startTime, matchup: g.matchup, teams: g.matchup.split('@').map((v) => v.trim()), bookContext: 'Unified board resolver', provenance: 'normalized_board', lastUpdated: new Date().toISOString(), propsPreview: data.board.filter((b) => b.gameId === g.id).map((b) => ({ id: b.id, player: b.player, market: b.market as TodayPayload['games'][number]['propsPreview'][number]['market'], line: b.line, odds: b.odds, rationale: ['Board signal'], provenance: 'normalized_board', lastUpdated: new Date().toISOString() })) })), board: data.board.map((b) => ({ ...b, market: b.market as TodayPayload['games'][number]['propsPreview'][number]['market'], rationale: ['Board signal'], provenance: 'normalized_board', lastUpdated: new Date().toISOString() })) };
        setGames(mapTodayPayload(asTodayPayload));
      })
      .catch(() => undefined);
  }, [nervous]);

  useEffect(() => {
    if (searchParams.get('sample') !== '1' || dedupedLegs.length > 0 || games.length === 0) return;
    const seeded = getScoutDraftLegs(games);
    if (seeded.length > 0) setSlip(seeded);
  }, [dedupedLegs.length, games, searchParams, setSlip]);

  const onAnalyzeSlip = () => {
    if (dedupedLegs.length === 0 || typeof window === 'undefined') return;
    const prefillText = serializeDraftSlip(dedupedLegs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(appendQuery(nervous.toHref('/stress-test'), { tab: 'analyze', prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY }));
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
    <section className="mx-auto max-w-7xl space-y-3">
      <TruthSpineHeader
        title="Draft Slip"
        subtitle="During loop: stage the ticket, enforce concentration checks, then analyze."
        actions={[
          { label: 'Build from Board', href: nervous.toHref('/today'), tone: 'primary' },
          { label: 'Try sample slip', href: appendQuery(nervous.toHref('/slip'), { sample: '1' }) },
          { label: 'Analyze (Stress Test)', href: nervous.toHref('/stress-test') }
        ]}
      />
      <SlipIntelBar legs={dedupedLegs} />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {games.length === 0 ? (
            <AliveEmptyState
              title="Today's prop board is empty"
              message="No board rows are loaded yet. Go to Board to add props, or seed a deterministic sample in demo mode."
              note={boardMode === 'demo' ? 'Demo mode (live feeds off).' : 'Waiting for live events — showing deterministic demo signals when needed.'}
              actions={(
                <>
                  <Link href={nervous.toHref('/today')} className="rounded border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-slate-950">Go to Board to add props</Link>
                  {boardMode === 'demo' ? <Link href={appendQuery(nervous.toHref('/slip'), { sample: '1' })} className="rounded border border-white/20 px-3 py-1.5">Seed sample props</Link> : null}
                </>
              )}
            />
          ) : <GamesToday games={games} onAddLeg={addLeg} />}
        </div>
        <div className="xl:sticky xl:top-4 xl:h-fit space-y-3">
          <CardSurface className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Bet Ticket</h2>
              <span className="mono-number text-xs text-slate-400">{dedupedLegs.length} legs</span>
            </div>
            {!isHydrated ? (
              <div className="space-y-2" aria-label="Ticket loading">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}
            {isHydrated && dedupedLegs.length === 0 ? (
              <AliveEmptyState
                title="Start with one board action"
                message="Add 2–3 leads from Board or load a sample; then we stage your ticket for Analyze and Track."
                actions={<><Link href={nervous.toHref('/today')} className="rounded border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-slate-950">Build from Board</Link><Link href={appendQuery(nervous.toHref('/slip'), { sample: '1' })} className="rounded border border-white/20 px-3 py-1.5 text-slate-100">Try sample</Link></>}
              />
            ) : null}
            <ul className="space-y-2">
              {isHydrated ? dedupedLegs.map((leg, index) => (
                <li key={leg.id} className="row-shell">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-semibold text-slate-100">{index + 1}. {leg.player}</p><p className="text-xs text-slate-300">{leg.marketType.toUpperCase()} {leg.line} <span className="mono-number">{leg.odds ?? '—'}</span></p></div>
                    <div className="flex items-center gap-1">
                      <Button intent="ghost" className="min-h-0 px-2 py-1 text-[11px]" onClick={() => moveLeg(index, index - 1)} disabled={index === 0}>↑</Button>
                      <Button intent="ghost" className="min-h-0 px-2 py-1 text-[11px]" onClick={() => moveLeg(index, index + 1)} disabled={index === dedupedLegs.length - 1}>↓</Button>
                      <Button intent="ghost" className="min-h-0 px-2 py-1 text-[11px] text-rose-100" onClick={() => removeLeg(leg.id)}>Remove</Button>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Badge variant={leg.volatility === 'low' ? 'success' : 'warning'} size="sm">{leg.volatility ?? 'watch'}</Badge>
                  </div>
                </li>
              )) : null}
            </ul>
            <Button intent="ghost" className="w-full text-sm text-slate-200 disabled:opacity-40" onClick={onCopyLegs} disabled={dedupedLegs.length === 0 || !isHydrated}>Copy legs {copyState === 'done' ? '✓' : copyState === 'error' ? '(copy unavailable in this browser)' : ''}</Button>
          </CardSurface>
          <SlipBuilder legs={dedupedLegs} onLegsChange={(nextLegs) => {
            if (nextLegs.length === 0) {
              clearSlip();
              return;
            }
            setSlip(nextLegs);
          }} />
          <ProBuildPanel legs={dedupedLegs} onApply={setSlip} />
          <div className="grid grid-cols-1 gap-3">
            <Button intent="secondary" className="w-full text-base disabled:cursor-not-allowed disabled:opacity-40" onClick={onTrackSlip} disabled={dedupedLegs.length === 0}>Track ({dedupedLegs.length})</Button>
            <Button intent="primary" className="w-full text-base disabled:cursor-not-allowed disabled:opacity-40" onClick={onAnalyzeSlip} disabled={dedupedLegs.length === 0}>Analyze ({dedupedLegs.length})</Button>
            {dedupedLegs.length === 0 ? <p className="text-xs text-slate-400">Actions unlock once at least one leg is added.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
