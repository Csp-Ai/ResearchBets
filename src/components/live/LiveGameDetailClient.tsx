'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { createClientRequestId } from '@/src/core/identifiers/session';
import { runUiAction } from '@/src/core/ui/actionContract';
import { buildNavigationHref } from '@/src/core/ui/navigation';

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

type OutcomePayload = {
  data: {
    winner: 'home' | 'away' | 'push';
    finalScore: { home: number; away: number };
    marketImplied: number;
    modelImplied: number;
    delta: number;
    edgeRealized: { expected_value: number; realized_value: number; was_correct: boolean };
  };
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
  const [outcome, setOutcome] = useState<OutcomePayload | null>(null);
  const [selectedProp, setSelectedProp] = useState<PropMomentum | null>(null);
  const [status, setStatus] = useState('Loading game detail…');
  const [traceId, setTraceId] = useState(initialTraceId ?? '');
  const [fallbackTraceId] = useState(() => createClientRequestId());
  const currentTraceId = traceId || fallbackTraceId;
  const router = useRouter();

  useEffect(() => {
    void runUiAction({
      actionName: 'open_live_game_detail',
      traceId: currentTraceId,
      properties: { game_id: gameId, sport },
      execute: async () => {
        const resolvedTrace = currentTraceId;
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
      traceId: currentTraceId,
      properties: { game_id: payload.game.gameId, sport: payload.game.sport },
      execute: async () => {
        const response = await fetch('/api/live/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: payload.game.gameId,
            sport: payload.game.sport,
            traceId: currentTraceId
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

  const loadOutcome = async () => {
    if (!payload) return;
    const action = await runUiAction({
      actionName: 'load_post_game_intelligence',
      traceId: currentTraceId,
      properties: { game_id: payload.game.gameId, sport: payload.game.sport },
      execute: async () => {
        const response = await fetch(
          `/api/live/outcome/${encodeURIComponent(payload.game.gameId)}?sport=${encodeURIComponent(payload.game.sport)}&trace_id=${encodeURIComponent(currentTraceId)}`
        );
        if (!response.ok)
          return { ok: false, source: 'demo' as const, error_code: 'outcome_unavailable' };
        const next = (await response.json()) as OutcomePayload;
        setOutcome(next);
        return { ok: true, data: next, source: 'demo' as const };
      }
    });
    setStatus(action.ok ? 'Post-game intelligence loaded.' : 'Post-game intelligence unavailable.');
  };

  const trackProp = async (prop: PropMomentum) => {
    if (!payload) return;
    const modelProbability = payload.model?.modelHome ?? payload.game.implied.home;
    const delta = modelProbability - payload.game.implied.home;
    const action = await runUiAction({
      actionName: 'track_prop_edge',
      traceId: currentTraceId,
      properties: { game_id: payload.game.gameId, prop_id: prop.propId },
      execute: async () => {
        const response = await fetch('/api/live/props/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: payload.game.gameId,
            propId: prop.propId,
            player: prop.player,
            market: prop.market,
            line: prop.line,
            modelProbability,
            delta,
            traceId: currentTraceId
          })
        });
        if (!response.ok)
          return { ok: false, source: 'live' as const, error_code: 'track_prop_failed' };
        return { ok: true, source: 'live' as const };
      }
    });
    setStatus(action.ok ? 'Prop tracking confirmed.' : 'Unable to track prop.');
    if (action.ok) setSelectedProp(null);
  };

  const openResearch = async () => {
    if (!payload) return;
    const outcomeAction = await runUiAction({
      actionName: 'open_in_research',
      traceId: currentTraceId,
      properties: { game_id: payload.game.gameId, sport: payload.game.sport },
      execute: async () => {
        router.push(
          buildNavigationHref({
            pathname: '/research',
            traceId: currentTraceId,
            params: { gameId: payload.game.gameId }
          })
        );
        return { ok: true, source: 'live' as const };
      }
    });
    if (!outcomeAction.ok) setStatus('Unable to open research view.');
  };

  const delta = useMemo(
    () => (payload?.model ? payload.model.modelHome - payload.game.implied.home : null),
    [payload]
  );

  if (!payload)
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        {status}
      </section>
    );

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
        <div className="mt-2 flex gap-2">
          {!payload.model ? (
            <button
              type="button"
              onClick={runQuickModel}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs"
            >
              Run quick model
            </button>
          ) : null}
          <button
            type="button"
            onClick={loadOutcome}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs"
          >
            Load outcome intelligence
          </button>
        </div>
      </div>

      {outcome ? (
        <div className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
          <h2 className="text-sm font-semibold">Post-Game Intelligence</h2>
          <p>
            Market implied vs model implied (pre-game): {pct(outcome.data.marketImplied)} vs{' '}
            {pct(outcome.data.modelImplied)}
          </p>
          <p>Delta: {(outcome.data.delta * 100).toFixed(2)}%</p>
          <p>
            Final outcome: {outcome.data.finalScore.home}-{outcome.data.finalScore.away} (
            {outcome.data.winner})
          </p>
          <p>
            Edge realized: {outcome.data.edgeRealized.realized_value >= 0 ? '+EV' : '-EV'} (
            {outcome.data.edgeRealized.realized_value.toFixed(4)})
          </p>
          <p>
            Calibration bucket: {(Math.floor(outcome.data.modelImplied * 10) * 10).toFixed(0)}-
            {(Math.floor(outcome.data.modelImplied * 10) * 10 + 10).toFixed(0)}%
          </p>
          <p>
            Confidence vs result: {pct(outcome.data.modelImplied)} vs{' '}
            {outcome.data.edgeRealized.was_correct ? 'Correct' : 'Incorrect'}
          </p>
          <span className="mt-1 inline-flex rounded bg-slate-800 px-2 py-1 text-xs">
            {Math.abs(outcome.data.delta) < 0.01
              ? 'Market Efficient'
              : outcome.data.edgeRealized.was_correct
                ? 'Edge Confirmed'
                : 'Edge Missed'}
          </span>
        </div>
      ) : null}

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
              <button
                type="button"
                onClick={() => setSelectedProp(prop)}
                className="w-full text-left"
              >
                {prop.player} · {prop.market} line {prop.line} · last10 {pct(prop.last10HitRate)} ·{' '}
                {prop.volatilityTag}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedProp ? (
        <div className="rounded border border-cyan-700 bg-slate-950 p-3 text-xs">
          <h3 className="text-sm font-semibold">EdgeCard · {selectedProp.player}</h3>
          <p>Line: {selectedProp.line}</p>
          <p>Hit rate: {pct(selectedProp.last10HitRate)}</p>
          <p>Volatility reason: {selectedProp.volatilityTag}</p>
          <p>Market movement: stable demo baseline</p>
          <p>Model probability: {pct(payload.model?.modelHome ?? payload.game.implied.home)}</p>
          <p>
            Delta:{' '}
            {(
              ((payload.model?.modelHome ?? payload.game.implied.home) -
                payload.game.implied.home) *
              100
            ).toFixed(2)}
            %
          </p>
          <p>Fragility variables: pace, usage, foul-trouble sensitivity</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => trackProp(selectedProp)}
              className="rounded bg-cyan-600 px-3 py-1"
            >
              Track this prop
            </button>
            <button
              type="button"
              onClick={() => setSelectedProp(null)}
              className="rounded bg-slate-700 px-3 py-1"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

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
