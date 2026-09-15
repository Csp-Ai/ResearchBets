'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { GamesToday, mapPropToLeg, type TodayGame } from '@/features/dashboard/GamesToday';
import { SlipBuilder, type SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  SCOUT_ANALYZE_PREFILL_STORAGE_KEY,
  serializeDraftSlip
} from '@/src/core/slips/serializeDraftSlip';
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
import { BuildThresholdAdvisorPanel } from '@/src/components/slips/BuildThresholdAdvisorPanel';
import { ProBuildPanel } from '@/src/components/slips/ProBuildPanel';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { DuringStageTracker } from '@/src/components/track/DuringStageTracker';
import { SlipOptimizerPanel } from '@/src/components/slips/SlipOptimizerPanel';
import {
  PreSubmitPatternWarningCard,
  PreSubmitSuggestedFixesCard
} from '@/src/components/slips/PreSubmitPatternWarning';
import {
  getBettorMistakePatternSummary,
  getDraftLearningAdvisory
} from '@/src/core/postmortem/patternSource';
import type { BettorMistakePatternSummary } from '@/src/core/postmortem/patterns';
import type { DraftLearningAdvisory } from '@/src/core/postmortem/learning';
import { buildPreSubmitPatternWarning } from '@/src/core/slips/preSubmitPatternWarning';

function mapTodayPayload(payload: TodayPayload): TodayGame[] {
  return payload.games.map((game) => ({
    id: game.id,
    league: game.league,
    matchup: game.matchup,
    players: game.propsPreview.map((prop) => ({
      id: prop.id,
      name: prop.player,
      injuryStatus: 'Status not provided',
      matchupNotes: prop.rationale[0] ?? prop.provenance ?? 'Board signal',
      props: [{ market: prop.market, line: prop.line ?? '0.5', odds: prop.odds }]
    }))
  }));
}

function getScoutDraftLegs(games: TodayGame[]): SlipBuilderLeg[] {
  const seeded: SlipBuilderLeg[] = [];
  for (const game of games) {
    for (const player of game.players) {
      for (const prop of player.props) {
        seeded.push(mapPropToLeg(player.name, prop, game.matchup));
        if (seeded.length === 2) return seeded;
      }
    }
  }
  return seeded;
}

export default function SlipPageClient() {
  const { slip, slip_id, trace_id, isHydrated, addLeg, removeLeg, clearSlip, setSlip } =
    useDraftSlip();
  const [games, setGames] = useState<TodayGame[]>([]);
  const [boardMode, setBoardMode] = useState<'live' | 'cache' | 'demo'>('demo');
  const [boardReason, setBoardReason] = useState<string | undefined>();
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nervous = useNervousSystem();
  const dedupedLegs = useMemo(
    () => Array.from(new Map(slip.map((leg) => [leg.id, leg])).values()),
    [slip]
  );
  const [patternSummary, setPatternSummary] = useState<BettorMistakePatternSummary | null>(null);
  const [learningAdvisory, setLearningAdvisory] = useState<DraftLearningAdvisory | null>(null);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return undefined;

    const refreshPatternSummary = () => {
      setPatternSummary(getBettorMistakePatternSummary());
      setLearningAdvisory(getDraftLearningAdvisory(dedupedLegs));
    };

    refreshPatternSummary();
    window.addEventListener('storage', refreshPatternSummary);
    window.addEventListener('focus', refreshPatternSummary);
    return () => {
      window.removeEventListener('storage', refreshPatternSummary);
      window.removeEventListener('focus', refreshPatternSummary);
    };
  }, [dedupedLegs, isHydrated]);

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
      .then((payload: { ok?: boolean; data?: TodayPayload } | null) => {
        if (!payload?.ok || !payload.data) return;
        setBoardMode(payload.data.mode);
        setBoardReason(payload.data.reason ?? payload.data.provenance?.reason);
        setGames(mapTodayPayload(payload.data));
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
    router.push(
      appendQuery(nervous.toHref('/stress-test'), {
        tab: 'analyze',
        prefillKey: SCOUT_ANALYZE_PREFILL_STORAGE_KEY,
        trace_id,
        slip_id
      })
    );
  };

  const onTrackSlip = () => {
    if (dedupedLegs.length === 0) return;
    const tracking = createTrackingFromDraft(dedupedLegs, boardMode, { slip_id, trace_id });
    saveSlip(tracking);
    router.push(
      appendQuery(nervous.toHref('/track'), {
        slip_id: tracking.slipId,
        trace_id: tracking.trace_id ?? trace_id
      })
    );
  };

  const onCopyLegs = async () => {
    if (typeof window === 'undefined' || dedupedLegs.length === 0) return;
    const copyLines = dedupedLegs.map(
      (leg, index) =>
        `${index + 1}. ${leg.player} ${leg.marketType} ${leg.line}${leg.odds ? ` (${leg.odds})` : ''}`
    );
    try {
      await navigator.clipboard.writeText(copyLines.join('\n'));
      setCopyState('done');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  const preSubmitPatternWarning = useMemo(() => {
    if (!patternSummary) return null;
    return buildPreSubmitPatternWarning({
      slip: dedupedLegs,
      patternSummary,
      learningAdvisory: learningAdvisory ?? getDraftLearningAdvisory(dedupedLegs)
    });
  }, [dedupedLegs, learningAdvisory, patternSummary]);

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
        subtitle={
          slip_id
            ? 'Run in progress: your staged ticket keeps the same thread into Analyze and Track.'
            : 'During loop: stage the ticket, enforce concentration checks, then analyze.'
        }
        actions={[
          { label: 'Build from Board', href: nervous.toHref('/today'), tone: 'primary' },
          { label: 'Try sample slip', href: appendQuery(nervous.toHref('/slip'), { sample: '1' }) },
          { label: 'Analyze (Stress Test)', href: nervous.toHref('/stress-test') }
        ]}
      />
      <SlipIntelBar legs={dedupedLegs} />
      {preSubmitPatternWarning ? (
        <PreSubmitPatternWarningCard warning={preSubmitPatternWarning} />
      ) : null}
      {preSubmitPatternWarning ? (
        <PreSubmitSuggestedFixesCard warning={preSubmitPatternWarning} />
      ) : null}
      <DuringStageTracker trace_id={trace_id ?? nervous.trace_id} mode={boardMode} compact />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {games.length > 0 && boardMode !== 'live' ? (
            <CardSurface className="border-amber-300/20 bg-amber-300/[0.04] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning" size="sm">{boardMode === 'demo' ? 'Demo data' : 'Cached data'}</Badge>
                <p className="text-xs text-amber-100/80">
                  {boardMode === 'demo'
                    ? 'Live markets are unavailable. These rows are deterministic examples, not live betting data.'
                    : 'Live refresh is unavailable. Showing the most recent cached slate.'}
                </p>
              </div>
              {boardReason ? <p className="mt-1 text-[10px] text-slate-500">Source status: {boardReason.replace(/_/g, ' ')}</p> : null}
            </CardSurface>
          ) : null}
          {games.length === 0 ? (
            <AliveEmptyState
              title="Today's prop board is empty"
              message="No board rows are loaded yet. Go to Board to add props, or seed a deterministic sample in demo mode."
              note={
                boardMode === 'demo'
                  ? 'Demo mode (live feeds off).'
                  : 'Waiting for live events. No synthetic live progress is shown.'
              }
              actions={
                <>
                  <Link
                    href={nervous.toHref('/today')}
                    className="rounded border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-slate-950"
                  >
                    Go to Board to add props
                  </Link>
                  {boardMode === 'demo' ? (
                    <Link
                      href={appendQuery(nervous.toHref('/slip'), { sample: '1' })}
                      className="rounded border border-white/20 px-3 py-1.5"
                    >
                      Seed sample props
                    </Link>
                  ) : null}
                </>
              }
            />
          ) : (
            <GamesToday games={games} onAddLeg={addLeg} />
          )}
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
                actions={
                  <>
                    <Link
                      href={nervous.toHref('/today')}
                      className="rounded border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-slate-950"
                    >
                      Build from Board
                    </Link>
                    <Link
                      href={appendQuery(nervous.toHref('/slip'), { sample: '1' })}
                      className="rounded border border-white/20 px-3 py-1.5 text-slate-100"
                    >
                      Try sample
                    </Link>
                  </>
                }
              />
            ) : null}
            <ul className="space-y-2">
              {isHydrated
                ? dedupedLegs.map((leg, index) => (
                    <li key={leg.id} className="row-shell">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100">
                            {index + 1}. {leg.player}
                          </p>
                          <p className="text-xs text-slate-300">
                            {leg.marketType.toUpperCase()} {leg.line}{' '}
                            <span className="mono-number">{leg.odds ?? '—'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            intent="ghost"
                            className="min-h-0 px-2 py-1 text-[11px]"
                            onClick={() => moveLeg(index, index - 1)}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            intent="ghost"
                            className="min-h-0 px-2 py-1 text-[11px]"
                            onClick={() => moveLeg(index, index + 1)}
                            disabled={index === dedupedLegs.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            intent="ghost"
                            className="min-h-0 px-2 py-1 text-[11px] text-rose-100"
                            onClick={() => removeLeg(leg.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <Badge variant={leg.volatility === 'low' ? 'success' : 'warning'} size="sm">
                          {leg.volatility ?? 'watch'}
                        </Badge>
                      </div>
                    </li>
                  ))
                : null}
            </ul>
            <Button
              intent="ghost"
              className="w-full text-sm text-slate-200 disabled:opacity-40"
              onClick={onCopyLegs}
              disabled={dedupedLegs.length === 0 || !isHydrated}
            >
              Copy legs{' '}
              {copyState === 'done'
                ? '✓'
                : copyState === 'error'
                  ? '(copy unavailable in this browser)'
                  : ''}
            </Button>
          </CardSurface>
          <BuildThresholdAdvisorPanel legs={dedupedLegs} onApply={setSlip} />
          <SlipBuilder
            legs={dedupedLegs}
            onLegsChange={(nextLegs) => {
              if (nextLegs.length === 0) {
                clearSlip();
                return;
              }
              setSlip(nextLegs);
            }}
          />
          <ProBuildPanel legs={dedupedLegs} onApply={setSlip} />
          <SlipOptimizerPanel legs={dedupedLegs} />
          <div className="grid grid-cols-1 gap-3">
            <Button
              intent="secondary"
              className="w-full text-base disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onTrackSlip}
              disabled={dedupedLegs.length === 0}
            >
              Track ({dedupedLegs.length})
            </Button>
            <Button
              intent="primary"
              className="w-full text-base disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onAnalyzeSlip}
              disabled={dedupedLegs.length === 0}
            >
              Analyze ({dedupedLegs.length})
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
