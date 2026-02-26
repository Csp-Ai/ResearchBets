'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { asMarketType, type MarketType } from '@/src/core/markets/marketType';
import type { TodayPayload } from '@/src/core/today/types';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type BoardProp = {
  id: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: 'stable' | 'watch';
  gameId: string;
};

type BoardGame = {
  id: string;
  matchup: string;
  startTime: string;
};

type BoardView = {
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  games: BoardGame[];
  board: BoardProp[];
};

type RecentSlip = {
  id: string;
  title: string;
  note: string;
};

const fallbackRecent: RecentSlip[] = [
  {
    id: 'demo-1',
    title: 'Correlation miss · NBA 2-leg',
    note: 'Two scoring overs in the same pace-down spot reduced the edge.'
  }
];

const pickRiskTag = (hitRateL10: number): 'stable' | 'watch' => (hitRateL10 >= 60 ? 'stable' : 'watch');

const normalizeTodayPayload = (payload: unknown): BoardView => {
  if (!payload || typeof payload !== 'object') {
    return { mode: 'demo', reason: 'invalid_payload', games: [], board: [] };
  }

  const record = payload as Partial<TodayPayload> & {
    board?: Array<Record<string, unknown>>;
    games?: Array<Record<string, unknown>>;
  };

  if (Array.isArray(record.board) && Array.isArray(record.games)) {
    return {
      mode: (record.mode as BoardView['mode']) ?? 'demo',
      reason: record.reason,
      games: record.games.map((game, index) => {
        const legacy = game as Record<string, unknown>;
        return {
          id: String(game.id ?? `game-${index}`),
          matchup: String(game.matchup ?? 'TBD @ TBD'),
          startTime: String(game.startTime ?? legacy.startISO ?? 'TBD')
        };
      }),
      board: record.board.map((prop, index) => ({
        id: String(prop.id ?? `prop-${index}`),
        player: String(prop.player ?? 'Player'),
        market: asMarketType(String(prop.market ?? 'points'), 'points'),
        line: String(prop.line ?? ''),
        odds: String(prop.consensusOdds ?? prop.odds ?? ''),
        hitRateL10: Number(prop.hitRateL10 ?? 55),
        riskTag: pickRiskTag(Number(prop.hitRateL10 ?? 55)),
        gameId: String(prop.gameId ?? '')
      }))
    };
  }

  if (!Array.isArray(record.games)) {
    return { mode: (record.mode as BoardView['mode']) ?? 'demo', reason: record.reason, games: [], board: [] };
  }

  const games: BoardGame[] = [];
  const board: BoardProp[] = [];

  record.games.forEach((game, gameIndex) => {
    const gameId = String(game.id ?? `game-${gameIndex}`);
    games.push({
      id: gameId,
      matchup: String(game.matchup ?? 'TBD @ TBD'),
      startTime: String(game.startTime ?? 'TBD')
    });

    const propsPreview = Array.isArray(game.propsPreview) ? (game.propsPreview as Array<Record<string, unknown>>) : [];
    propsPreview.forEach((prop, propIndex) => {
      const rationaleCount = Array.isArray(prop.rationale) ? prop.rationale.length : 1;
      const hitRateL10 = Math.max(45, 50 + rationaleCount * 6 - propIndex * 2);
      board.push({
        id: String(prop.id ?? `${gameId}-prop-${propIndex}`),
        player: String(prop.player ?? 'Player'),
        market: asMarketType(String(prop.market ?? 'points'), 'points'),
        line: String(prop.line ?? ''),
        odds: String(prop.odds ?? ''),
        hitRateL10,
        riskTag: pickRiskTag(hitRateL10),
        gameId
      });
    });
  });

  return {
    mode: (record.mode as BoardView['mode']) ?? 'demo',
    reason: record.reason,
    games,
    board
  };
};

const parseOdds = (odds: string): number => {
  const value = Number(odds);
  return Number.isFinite(value) ? value : 100;
};

export default function LandingVisionClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<BoardView>({ mode: 'demo', games: [], board: [] });
  const [recent, setRecent] = useState<RecentSlip[]>(fallbackRecent);

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
        setToday(payload);
      } catch {
        // Keep deterministic defaults.
      }
    };

    const loadRecent = async () => {
      try {
        const response = await fetch('/api/slips/recent?limit=2', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const payload = (await response.json()) as { slips?: Array<{ id?: string; title?: string; note?: string }> };
        if (!Array.isArray(payload.slips) || payload.slips.length === 0) return;
        setRecent(
          payload.slips.slice(0, 2).map((item, index) => ({
            id: item.id ?? `recent-${index}`,
            title: item.title ?? 'Recent slip',
            note: item.note ?? 'Open review for full postmortem context.'
          }))
        );
      } catch {
        // fallback stays seeded
      }
    };

    void loadBoard();
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

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 text-slate-100">
      <header className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-wide">ResearchBets front door</h1>
            <p className="text-sm text-slate-300">Board to Slip to Risk Check to Review with one context spine.</p>
          </div>
          <p className="text-xs text-slate-400">
            {today.mode === 'live' ? 'Live mode active' : 'Demo mode (deterministic fallback active)'}
            {today.reason ? ` · ${today.reason}` : ''}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push(nervous.toHref('/today'))} className="rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Open board</button>
          <button type="button" onClick={() => router.push(nervous.toHref('/slip'))} className="rounded border border-slate-600 px-3 py-2 text-sm">Open slip ({slip.length})</button>
          <button type="button" onClick={() => router.push(nervous.toHref('/stress-test'))} className="rounded border border-slate-600 px-3 py-2 text-sm">Run risk check</button>
          <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review' }))} className="rounded border border-slate-600 px-3 py-2 text-sm">Open review</button>
          <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/research'), { mode: 'demo' }))} className="rounded border border-amber-500/60 px-3 py-2 text-sm text-amber-200">Research demo</button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-semibold">Tonight&apos;s Board</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {today.board.slice(0, 6).map((prop) => {
            const inSlip = slip.some((leg) => leg.id === prop.id);
            return (
              <article key={prop.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-400">{gameById.get(prop.gameId)?.matchup ?? 'TBD matchup'} · {gameById.get(prop.gameId)?.startTime ?? 'TBD'}</p>
                <p className="mt-1 text-base font-semibold">{prop.player} {prop.market} {prop.line}</p>
                <p className="text-sm text-slate-300">{prop.odds} · hit rate L10 {prop.hitRateL10}%</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={inSlip} onClick={() => onAddLeg(prop)} className="rounded bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50">{inSlip ? 'Added' : 'Add to slip'}</button>
                  {inSlip ? (
                    <button type="button" onClick={() => removeLeg(prop.id)} className="rounded border border-rose-400/60 px-2 py-1 text-xs text-rose-200">Remove</button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
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
            <article key={item.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-300">{item.note}</p>
            </article>
          ))}
        </div>
        <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review' }))} className="mt-3 rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Go to review tab</button>
      </section>
    </main>
  );
}
