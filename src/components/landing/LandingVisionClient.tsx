'use client';

import React from 'react';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { LiveOddsBadge } from '@/src/components/today/LiveOddsBadge';
import { TodayLoopPanel } from '@/src/components/today/TodayLoopPanel';
import { type LiveOddsPayload, buildBoardViewModel } from '@/src/core/today/boardViewModel';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';
import { fallbackToday } from '@/src/core/today/fallback';
import { normalizeTodayPayload, type NormalizedToday } from '@/src/core/today/normalize';
import { ensureAnonSessionId } from '@/src/core/identifiers/session';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type BoardProp = NormalizedToday['board'][number];

type RecentSlip = {
  id: string;
  title: string;
  note: string;
  trace_id?: string;
};

const LAST_TRACE_STORAGE_KEY = 'rb-last-trace-id';

const fallbackRecent: RecentSlip[] = [
  {
    id: 'demo-1',
    title: 'Correlation miss · NBA 2-leg',
    note: 'Two scoring overs in the same pace-down spot reduced the edge.'
  }
];

const parseOdds = (odds: string): number => {
  const value = Number(odds);
  return Number.isFinite(value) ? value : 100;
};

export default function LandingVisionClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<NormalizedToday>(() => fallbackToday(nervous));
  const [recent, setRecent] = useState<RecentSlip[]>(fallbackRecent);
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);
  const [report, setReport] = useState<SlipStructureReport | undefined>(undefined);
  const [liveOdds, setLiveOdds] = useState<LiveOddsPayload | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLastTraceId(window.localStorage.getItem(LAST_TRACE_STORAGE_KEY));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadBoard = async () => {
      const url = appendQuery('/api/today', {
        sport: nervous.sport,
        tz: nervous.tz,
        date: nervous.date,
        demo: nervous.mode === 'demo' ? '1' : undefined
      });

      try {
        const response = await fetch(url, {
          headers: { 'x-live-mode': nervous.mode === 'live' ? '1' : '0' },
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = normalizeTodayPayload(await response.json());
        setToday((current) => (payload.board.length > 0 ? payload : { ...current, mode: payload.mode, reason: 'empty_board_from_api' }));
      } catch {
        // Keep deterministic fallback state.
      }
    };

    const loadLiveOdds = async () => {
      if (nervous.mode !== 'live') {
        setLiveOdds(undefined);
        return;
      }

      try {
        const response = await fetch(appendQuery('/api/live/market', { sport: nervous.sport }), {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data?: { snapshot?: { loadedAt?: string; games?: LiveOddsPayload['games'] } };
        };
        setLiveOdds(payload.data?.snapshot ? { loadedAt: payload.data.snapshot.loadedAt, games: payload.data.snapshot.games } : undefined);
      } catch {
        setLiveOdds(undefined);
      }
    };

    const loadRecent = async () => {
      try {
        const anonId = ensureAnonSessionId();
        const response = await fetch(appendQuery('/api/slips/recent', { limit: 2, anon_id: anonId }), { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const payload = (await response.json()) as { slips?: Array<{ id?: string; title?: string; note?: string; trace_id?: string }> };
        if (!Array.isArray(payload.slips) || payload.slips.length === 0) return;
        setRecent(
          payload.slips.slice(0, 2).map((item, index) => ({
            id: item.id ?? `recent-${index}`,
            title: item.title ?? 'Recent slip',
            note: item.note ?? 'Open review for full postmortem context.',
            trace_id: item.trace_id
          }))
        );
      } catch {
        // fallback stays seeded
      }
    };

    void loadBoard();
    void loadLiveOdds();
    void loadRecent();

    return () => controller.abort();
  }, [nervous.date, nervous.mode, nervous.sport, nervous.tz]);

  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);

  const ideas = useMemo(() => {
    const sorted = [...today.board].sort((a, b) => b.hitRateL10 - a.hitRateL10);
    const stable = sorted.filter((prop) => prop.riskTag === 'stable');
    const positiveOdds = sorted.filter((prop) => parseOdds(prop.odds) > 0);
    const watch = sorted.filter((prop) => prop.riskTag === 'watch');

    return [
      {
        id: 'quick-hit',
        name: '2-leg quick hit',
        legs: sorted.slice(0, 2)
      },
      {
        id: 'value-lean',
        name: 'Value lean',
        legs: [positiveOdds[0], stable[0]].filter((value): value is BoardProp => Boolean(value))
      },
      {
        id: 'aggressive',
        name: 'Aggressive',
        legs: [sorted[0], sorted[1], watch[0]].filter((value): value is BoardProp => Boolean(value))
      }
    ].filter((idea) => idea.legs.length >= 2);
  }, [today.board]);

  const boardCards = useMemo(() => buildBoardViewModel(today, liveOdds), [today, liveOdds]);
  const hasLiveOdds = boardCards.some((card) => card.is_live);
  const modeLabel = today.mode === 'live' && hasLiveOdds
    ? 'Live'
    : today.mode === 'demo'
      ? 'Demo mode (live feeds off)'
      : today.reason?.includes('fallback')
        ? 'Degraded (using fallback)'
        : 'Live';
  const healthHint = today.mode === 'live' && !hasLiveOdds
    ? 'Live odds unavailable for some props'
    : today.mode === 'demo'
      ? 'Demo mode (live feeds off)'
      : undefined;

  const onAddLeg = (prop: BoardProp) => {
    addLeg({
      id: prop.id,
      player: prop.player,
      marketType: prop.market,
      line: prop.line,
      odds: prop.odds,
      game: gameById.get(prop.gameId)?.matchup
    });
  };

  const onAddIdea = (ideaLegs: BoardProp[]) => {
    ideaLegs.forEach(onAddLeg);
  };

  const onAddTopProps = () => {
    const topProps = [...today.board].sort((a, b) => b.hitRateL10 - a.hitRateL10).slice(0, 2);
    topProps.forEach(onAddLeg);
  };

  const onRunRisk = () => {
    const next = buildSlipStructureReport(
      slip.map((leg) => ({
        id: leg.id,
        player: leg.player,
        market: leg.marketType,
        line: String(leg.line ?? ''),
        odds: leg.odds,
        game: leg.game
      })),
      { mode: today.mode, reason: today.reason }
    );
    setReport(next);
  };




  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 text-slate-100">
      <header className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-wide">ResearchBets front door</h1>
            <p className="text-sm text-slate-300">Today → Slip → Risk → Review with one context spine.</p>
          </div>
        </div>
      </header>

      <TodayLoopPanel
        slipCount={slip.length}
        report={report}
        modeLabel={modeLabel}
        healthHint={healthHint}
        onAddTopProps={onAddTopProps}
        onOpenSlip={() => router.push(nervous.toHref('/slip'))}
        onRunRisk={onRunRisk}
        onOpenReview={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review', trace_id: lastTraceId ?? undefined }))}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-semibold">Tonight&apos;s Board</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {boardCards.slice(0, 12).map((card) => {
            const inSlip = slip.some((leg) => leg.id === card.id);
            const prop = today.board.find((entry) => entry.id === card.id);
            if (!prop) return null;
            return (
              <article key={card.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-400">{card.game ?? 'TBD matchup'} · {card.start ?? 'TBD'}</p>
                <p className="mt-1 text-base font-semibold">{card.selectionLabel}</p>
                <p className="text-sm text-slate-300">Line {card.line ?? 'n/a'} · hit rate L10 {card.hit_rate_l10 ?? 0}%</p>
                <div className="mt-2">
                  <LiveOddsBadge consensus={card.consensus_odds} live_odds={card.live_odds} best_odds={card.best_odds} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={inSlip} onClick={() => onAddLeg(prop)} className="rounded bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50">{inSlip ? 'Added' : 'Add to slip'}</button>
                  {inSlip ? (
                    <button type="button" onClick={() => removeLeg(card.id)} className="rounded border border-rose-400/60 px-2 py-1 text-xs text-rose-200">Remove</button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        {boardCards.length === 0 ? <p className="mt-2 text-xs text-slate-400">Board fallback unavailable.</p> : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-semibold">Parlay ideas</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {ideas.map((idea) => (
            <article key={idea.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <p className="text-sm font-semibold">{idea.name}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {idea.legs.map((leg) => (
                  <li key={leg.id}>{leg.player} {leg.market} {leg.line} ({leg.odds})</li>
                ))}
              </ul>
              <button type="button" onClick={() => onAddIdea(idea.legs)} className="mt-3 rounded border border-slate-600 px-2 py-1 text-xs">Add idea to slip</button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-semibold">Review past parlays</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {recent.map((item) => (
            <button key={item.id} type="button" onClick={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review', trace_id: item.trace_id }))} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-left">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-300">{item.note}</p>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review', trace_id: lastTraceId ?? undefined }))} className="mt-3 rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Go to review tab</button>
      </section>
    </main>
  );
}
