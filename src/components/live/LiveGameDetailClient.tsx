'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { createClientRequestId } from '@/src/core/identifiers/session';
import { runUiAction } from '@/src/core/ui/actionContract';

type PropMomentum = {
  propId: string;
  player: string;
  market: string;
  line: number;
  last10HitRate: number;
  volatilityTag: string;
};

type DetailPayload = {
  game: {
    gameId: string;
    label: string;
    sport: string;
    source: string;
    startsAt: string;
    implied: { home: number; away: number };
    lines: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number };
  };
  model?: { modelHome: number; modelAway: number; traceId: string } | null;
  props: PropMomentum[];
};

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function LiveGameDetailClient({
  gameId,
  sport,
  initialTraceId
}: {
  gameId: string;
  sport: string;
  initialTraceId?: string;
}) {
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [status, setStatus] = useState('Loading game detail…');
  const [traceId, setTraceId] = useState(initialTraceId ?? '');
  const router = useRouter();

  useEffect(() => {
    void runUiAction({
      actionName: 'open_live_game_detail',
      traceId: traceId || undefined,
      execute: async () => {
        const resolvedTrace = traceId || createClientRequestId();
        const response = await fetch(
          `/api/live/game/${encodeURIComponent(gameId)}?sport=${encodeURIComponent(sport)}&trace_id=${encodeURIComponent(resolvedTrace)}`
        );
        if (!response.ok)
          return { ok: false, source: 'demo' as const, error_code: 'detail_unavailable' };
        const next = (await response.json()) as DetailPayload & { trace_id?: string };
        setPayload(next);
        setTraceId(next.trace_id ?? resolvedTrace);
        setStatus('Live detail loaded.');
        return {
          ok: true,
          data: next,
          source: 'cache' as const,
          degraded: next.game.source === 'DEMO'
        };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, sport]);

  const runQuickModel = async () => {
    if (!payload) return;
    const action = await runUiAction({
      actionName: 'run_quick_model',
      traceId: traceId || undefined,
      execute: async () => {
        const response = await fetch('/api/live/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: payload.game.gameId,
            sport: payload.game.sport,
            traceId: traceId || createClientRequestId()
          })
        });
        if (!response.ok)
          return { ok: false, source: 'demo' as const, error_code: 'quick_model_failed' };
        const next = (await response.json()) as {
          data: DetailPayload['model'];
          source: 'cache' | 'demo';
        };
        setPayload((current) => (current ? { ...current, model: next.data } : current));
        return { ok: true, data: next.data, source: next.source };
      }
    });
    setStatus(action.ok ? 'Quick model loaded.' : 'Quick model failed; market remains visible.');
  };

  const openResearch = async () => {
    if (!payload) return;
    const outcome = await runUiAction({
      actionName: 'open_in_research',
      traceId: traceId || undefined,
      execute: async () => {
        router.push(
          `/research?gameId=${encodeURIComponent(payload.game.gameId)}&trace_id=${encodeURIComponent(traceId || createClientRequestId())}`
        );
        return { ok: true, source: 'live' as const };
      }
    });
    if (!outcome.ok) setStatus('Unable to open research view.');
  };

  if (!payload)
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        {status}
      </section>
    );

  const delta = payload.model ? payload.model.modelHome - payload.game.implied.home : null;

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h1 className="text-2xl font-semibold">{payload.game.label}</h1>
      <p className="text-xs text-slate-400">
        Source {payload.game.source} · {status}
      </p>

      <div className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
        <p>
          Market lines: H {String(payload.game.lines.homeMoneyline ?? 'n/a')} / A{' '}
          {String(payload.game.lines.awayMoneyline ?? 'n/a')} · Spread{' '}
          {String(payload.game.lines.spread ?? 'n/a')} · Total{' '}
          {String(payload.game.lines.total ?? 'n/a')}
        </p>
        <p>
          Market implied: H {pct(payload.game.implied.home)} / A {pct(payload.game.implied.away)}
        </p>
        <p>
          Model implied:{' '}
          {payload.model
            ? `H ${pct(payload.model.modelHome)} / A ${pct(payload.model.modelAway)}`
            : 'Model pending'}
        </p>
        <p title="Delta is not a pick. It’s a difference between implied probabilities.">
          Delta: {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
        </p>
        {!payload.model ? (
          <button
            type="button"
            onClick={runQuickModel}
            className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-xs"
          >
            Run quick model
          </button>
        ) : null}
      </div>

      <div className="rounded border border-slate-800 bg-slate-950 p-3">
        <h2 className="text-sm font-semibold">Player Props Momentum v0</h2>
        <ul className="mt-2 space-y-2 text-xs">
          {payload.props.length === 0 ? (
            <li className="text-slate-400">
              No props available. Demo fallback can be generated by picking another sport.
            </li>
          ) : null}
          {payload.props.map((prop) => (
            <li key={prop.propId} className="rounded border border-slate-800 p-2">
              {prop.player} · {prop.market} line {prop.line} · last10 {pct(prop.last10HitRate)} ·{' '}
              {prop.volatilityTag}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={openResearch}
        className="rounded bg-cyan-600 px-3 py-2 text-sm"
      >
        Open in Research
      </button>
    </section>
  );
}
