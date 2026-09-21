'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { GamesToday, mapPropToLeg, type TodayGame } from '@/features/dashboard/GamesToday';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
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
import { AliveEmptyState } from '@/src/components/ui/AliveEmptyState';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/button';
import { BuildDecisionCopilot } from '@/src/components/slips/BuildDecisionCopilot';
import { BuildThresholdAdvisorPanel } from '@/src/components/slips/BuildThresholdAdvisorPanel';
import { ProBuildPanel } from '@/src/components/slips/ProBuildPanel';
import { Skeleton } from '@/src/components/ui/Skeleton';
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

  const sourceLabel = boardMode === 'live' ? 'Live markets' : boardMode === 'cache' ? 'Cached markets' : 'Demo data';
  const hasTicket = isHydrated && dedupedLegs.length > 0;

  return (
    <section className="mx-auto max-w-6xl pb-16">
      <header className="border-b border-white/10 pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
            Build
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{nervous.sport}</span>
            <span className="text-slate-700">/</span>
            <span>{sourceLabel}</span>
          </div>
        </div>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-slate-50 sm:text-4xl">
          Build one ticket. Stress-test what can break it.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Add the legs you actually want to bet. ResearchBets keeps the ticket in one place, shows the structural weak point, and gives you one clear next move.
        </p>
      </header>

      {boardMode !== 'live' ? (
        <div className="flex flex-wrap items-start gap-3 border-b border-amber-300/15 py-3 text-xs">
          <Badge variant="warning" size="sm">{boardMode === 'demo' ? 'Demo data' : 'Cached data'}</Badge>
          <div className="max-w-3xl text-slate-400">
            <p className="m-0">
              {boardMode === 'demo'
                ? 'Live markets are unavailable. Board rows are examples, not live betting data.'
                : 'Live refresh is unavailable. Showing the most recent cached slate.'}
            </p>
            {boardReason ? <p className="m-0 mt-1 text-[11px] text-slate-600">{boardReason.replace(/_/g, ' ')}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">Find a leg</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-100">Today&apos;s board</h2>
            </div>
            <Link href={nervous.toHref('/today')} className="text-xs text-cyan-200 hover:text-cyan-100">
              Open full board →
            </Link>
          </div>

          {games.length === 0 ? (
            <AliveEmptyState
              title="No board rows available"
              message="You can return to the Board, or load a deterministic sample when demo data is active."
              note={boardMode === 'demo' ? 'Demo mode · live feeds unavailable.' : 'Waiting for market data.'}
              actions={
                <>
                  <Link href={nervous.toHref('/today')} className="ui-button ui-button-primary min-h-0 px-3 py-1.5">
                    Open Board
                  </Link>
                  {boardMode === 'demo' ? (
                    <Link href={appendQuery(nervous.toHref('/slip'), { sample: '1' })} className="ui-button ui-button-ghost min-h-0 px-3 py-1.5">
                      Load sample
                    </Link>
                  ) : null}
                </>
              }
            />
          ) : (
            <GamesToday games={games} onAddLeg={addLeg} />
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <div className="border-t border-white/10 lg:border-t-0">
            <div className="flex items-center justify-between border-b border-white/10 py-3">
              <div>
                <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">Your ticket</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-100">
                  {dedupedLegs.length === 0 ? 'No legs yet' : `${dedupedLegs.length}-leg parlay`}
                </h2>
              </div>
              {hasTicket ? (
                <Button intent="ghost" className="min-h-0 px-2 py-1 text-xs text-slate-400" onClick={clearSlip}>
                  Clear
                </Button>
              ) : null}
            </div>

            {!isHydrated ? (
              <div className="space-y-2 py-4" aria-label="Ticket loading">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : null}

            {isHydrated && dedupedLegs.length === 0 ? (
              <div className="py-6 text-sm text-slate-400">
                <p className="m-0 text-slate-200">Add a leg from the board.</p>
                <p className="m-0 mt-2 leading-6">Your ticket, ResearchBets read, and next action will stay together here.</p>
              </div>
            ) : null}

            <ol className="divide-y divide-white/8">
              {isHydrated
                ? dedupedLegs.map((leg, index) => (
                    <li key={leg.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-semibold text-slate-100">{leg.player}</p>
                          <p className="m-0 mt-1 text-xs text-slate-400">
                            {leg.marketType.replace(/_/g, ' ')} · {leg.line}
                            {leg.odds ? <span className="font-mono text-slate-300"> · {leg.odds}</span> : null}
                          </p>
                          {leg.game ? <p className="m-0 mt-1 truncate text-[11px] text-slate-600">{leg.game}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label={`Move ${leg.player} up`} className="px-1.5 py-1 text-xs text-slate-500 hover:text-white disabled:opacity-20" onClick={() => moveLeg(index, index - 1)} disabled={index === 0}>↑</button>
                          <button type="button" aria-label={`Move ${leg.player} down`} className="px-1.5 py-1 text-xs text-slate-500 hover:text-white disabled:opacity-20" onClick={() => moveLeg(index, index + 1)} disabled={index === dedupedLegs.length - 1}>↓</button>
                          <button type="button" className="ml-1 px-1 py-1 text-xs text-slate-500 hover:text-rose-200" onClick={() => removeLeg(leg.id)}>Remove</button>
                        </div>
                      </div>
                    </li>
                  ))
                : null}
            </ol>

            {hasTicket ? (
              <div className="border-t border-white/10 pt-4">
                <Button intent="primary" className="w-full text-sm" onClick={onAnalyzeSlip}>
                  Analyze ticket
                </Button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button intent="secondary" className="w-full text-xs" onClick={onTrackSlip}>Track live</Button>
                  <Button intent="ghost" className="w-full text-xs" onClick={onCopyLegs}>
                    {copyState === 'done' ? 'Copied ✓' : copyState === 'error' ? 'Copy unavailable' : 'Copy legs'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <SlipIntelBar legs={dedupedLegs} />

      {hasTicket ? (
        <div className="mt-6">
          <BuildDecisionCopilot legs={dedupedLegs} onAnalyze={onAnalyzeSlip} />
        </div>
      ) : null}

      {hasTicket ? (
        <div className="mt-6 space-y-3">
          <details className="border-b border-white/10 pb-3">
            <summary className="cursor-pointer list-none py-2 text-sm font-medium text-slate-200 hover:text-white">
              Improve thresholds <span className="ml-2 text-xs font-normal text-slate-500">optional</span>
            </summary>
            <div className="pt-3">
              <BuildThresholdAdvisorPanel legs={dedupedLegs} onApply={setSlip} />
            </div>
          </details>

          <details className="border-b border-white/10 pb-3">
            <summary className="cursor-pointer list-none py-2 text-sm font-medium text-slate-200 hover:text-white">
              Advanced construction <span className="ml-2 text-xs font-normal text-slate-500">optional</span>
            </summary>
            <div className="grid gap-3 pt-3 lg:grid-cols-2">
              <ProBuildPanel legs={dedupedLegs} onApply={setSlip} />
              <SlipOptimizerPanel legs={dedupedLegs} />
            </div>
          </details>

          {preSubmitPatternWarning ? (
            <details className="border-b border-white/10 pb-3">
              <summary className="cursor-pointer list-none py-2 text-sm font-medium text-slate-200 hover:text-white">
                Bettor memory <span className="ml-2 text-xs font-normal text-slate-500">past-pattern check</span>
              </summary>
              <div className="grid gap-3 pt-3 lg:grid-cols-2">
                <PreSubmitPatternWarningCard warning={preSubmitPatternWarning} />
                <PreSubmitSuggestedFixesCard warning={preSubmitPatternWarning} />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
