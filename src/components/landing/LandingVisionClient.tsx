'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { fallbackToday } from '@/src/core/today/fallback';
import { normalizeTodayPayload, type NormalizedToday } from '@/src/core/today/normalize';
import { submitDraftSlip } from '@/src/core/slips/submitDraftSlip';
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
  const [hint, setHint] = useState<string | null>(null);
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);

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

  const submitAndOpen = async (path: '/stress-test' | '/research') => {
    if (slip.length === 0) {
      setHint('Add at least one leg first. We will keep your context and open your slip builder.');
      router.push(nervous.toHref('/slip'));
      return;
    }

    const submission = await submitDraftSlip({ spine: nervous, slip });
    if (!submission.ok) {
      setHint('We could not submit this slip yet. You can still continue from the slip builder.');
      router.push(nervous.toHref('/slip'));
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_TRACE_STORAGE_KEY, submission.trace_id);
    }
    setLastTraceId(submission.trace_id);
    router.push(appendQuery(nervous.toHref(path), { trace_id: submission.trace_id }));
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
        {hint ? <p className="mt-3 rounded border border-cyan-400/40 bg-cyan-950/30 px-2 py-1 text-xs text-cyan-100">{hint}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push(nervous.toHref('/today'))} className="rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Open board</button>
          <button type="button" onClick={() => router.push(nervous.toHref('/slip'))} className="rounded border border-slate-600 px-3 py-2 text-sm">Open slip ({slip.length})</button>
          <button type="button" onClick={() => void submitAndOpen('/stress-test')} className="rounded border border-slate-600 px-3 py-2 text-sm">Run risk check</button>
          <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review' }))} className="rounded border border-slate-600 px-3 py-2 text-sm">Open review</button>
          <button type="button" onClick={() => void submitAndOpen('/research')} className="rounded border border-amber-500/60 px-3 py-2 text-sm text-amber-200">Research run</button>
          {lastTraceId ? <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/stress-test'), { trace_id: lastTraceId }))} className="rounded border border-emerald-500/60 px-3 py-2 text-sm text-emerald-200">Open latest run</button> : null}
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
