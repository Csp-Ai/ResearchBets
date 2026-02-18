'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createLivePoller } from '@/src/core/live/polling';
import { createClientRequestId } from '@/src/core/identifiers/session';
import { validateCopyPolicyInDev } from '@/src/core/policy/copyPolicyDevValidator';
import { runUiAction } from '@/src/core/ui/actionContract';
import { buildNavigationHref } from '@/src/core/ui/navigation';

type LiveGame = {
  gameId: string;
  sport: string;
  label: string;
  startsAt: string;
  source: 'DEMO' | 'derived' | 'scraped';
  degraded: boolean;
  implied: { home: number; away: number; source: 'moneyline' | 'fallback' };
  model?: {
    modelHome: number;
    modelAway: number;
    source: 'cache' | 'demo';
    traceId: string;
  } | null;
};

type Freshness = {
  source: 'live' | 'cache' | 'demo';
  asOfIso: string | null;
  stale: boolean;
  degraded: boolean;
};

type MarketResponse = {
  trace_id?: string;
  source?: string;
  degraded?: boolean;
  data?: {
    snapshot?: {
      games?: LiveGame[];
      as_of_iso?: string;
      cache_status?: 'hit' | 'miss' | 'stale';
      degraded?: boolean;
      source?: 'DEMO' | 'derived' | 'scraped';
    };
  };
};

const SPORTS = ['NFL', 'NBA', 'MLB', 'Soccer', 'UFC', 'NHL'];

const LIVE_GAMES_COPY = [
  'Loading live market board…',
  'Research Terminal board refreshed from cached/demo snapshot.',
  'No rows yet. Showing deterministic demo market rows.',
  'Live feed degraded. Demo market rows stay visible for terminal workflow.',
  'Quick model complete. Delta panel updated (delta is not a pick).',
  'Quick model unavailable; market-only terminal view remains available.',
  'Unable to open game details; retry from cached rows.',
  'No live market rows returned. Try another sport or continue with deterministic demo rows via the tabs.',
  'Market Pulse',
  'STALE',
  'DEGRADED'
] as const;

const asPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const resolvePulseSource = (
  cacheStatus?: 'hit' | 'miss' | 'stale',
  marketSource?: 'DEMO' | 'derived' | 'scraped'
): Freshness['source'] => {
  if (marketSource === 'DEMO') return 'demo';
  if (cacheStatus === 'hit' || cacheStatus === 'stale') return 'cache';
  return 'live';
};

export function LiveGamesClient({ initialSport }: { initialSport: string }) {
  const [sport, setSport] = useState(initialSport);
  const [traceId, setTraceId] = useState('');
  const [fallbackTraceId] = useState(() => createClientRequestId());

  const currentTraceId = traceId || fallbackTraceId;
  const [games, setGames] = useState<LiveGame[]>([]);
  const [status, setStatus] = useState('Loading live market board…');
  const [freshness, setFreshness] = useState<Freshness>({
    source: 'cache',
    asOfIso: null,
    stale: false,
    degraded: false
  });
  const router = useRouter();

  const loadGames = useCallback(
    async (selectedSport: string) => {
      const action = await runUiAction({
        actionName: 'see_live_games',
        traceId: currentTraceId,
        properties: { sport: selectedSport },
        execute: async () => {
          const nextTraceId = currentTraceId;
          const response = await fetch(
            `/api/live/market?sport=${encodeURIComponent(selectedSport)}&trace_id=${encodeURIComponent(nextTraceId)}`
          );
          if (!response.ok) {
            if (response.status === 429) {
              throw { status: response.status, message: 'live_market_rate_limited' };
            }
            return { ok: false, source: 'demo' as const, error_code: 'live_market_failed' };
          }
          const payload = (await response.json()) as {
            snapshot?: { games?: LiveGame[]; degraded?: boolean };
            trace_id?: string;
          };
          setTraceId(payload.trace_id ?? nextTraceId);
          setGames(payload.snapshot?.games ?? []);
          setStatus(
            (payload.snapshot?.games ?? []).length > 0
              ? 'Research Terminal board refreshed from cached/demo snapshot.'
              : 'No rows yet. Showing deterministic demo market rows.'
          );
          return {
            ok: true,
            data: payload.snapshot?.games ?? [],
            source: 'cache' as const,
            degraded: payload.snapshot?.degraded ?? false
          };
        }
      });

      if (!action.ok) {
        setStatus('Live feed degraded. Demo market rows stay visible for terminal workflow.');
        setGames([]);
        throw { message: action.error_code ?? 'live_market_failed' };
      }
    },
    [currentTraceId]
  );

  useEffect(() => {
    validateCopyPolicyInDev([
      {
        id: 'live.games.client',
        surface: 'live',
        file: 'src/components/live/LiveGamesClient.tsx',
        strings: LIVE_GAMES_COPY
      }
    ]);
  }, []);

  useEffect(() => {
    const poller = createLivePoller({
      key: `live_games:${sport}`,
      traceId: () => currentTraceId,
      run: () => loadGames(sport),
      onDegraded: () => {
        setStatus('Live feed degraded. Demo market rows stay visible for terminal workflow.');
      }
    });
    poller.start();
    return () => {
      poller.stop();
    };
  }, [currentTraceId, loadGames, sport]);

  const runQuickModel = async (game: LiveGame) => {
    setStatus(`Running lightweight model pass for ${game.label}…`);
    const result = await runUiAction({
      actionName: 'run_quick_model',
      traceId: currentTraceId,
      properties: { game_id: game.gameId, sport: game.sport },
      execute: async () => {
        const response = await fetch('/api/live/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.gameId,
            sport: game.sport,
            traceId: currentTraceId
          })
        });
        if (!response.ok)
          return { ok: false, source: 'demo' as const, error_code: 'quick_model_failed' };
        const payload = (await response.json()) as {
          data: LiveGame['model'];
          source: 'cache' | 'demo';
          degraded?: boolean;
        };
        setGames((rows) =>
          rows.map((row) => (row.gameId === game.gameId ? { ...row, model: payload.data } : row))
        );
        return {
          ok: true,
          data: payload.data,
          source: payload.source,
          degraded: payload.degraded ?? false
        };
      }
    });

    setStatus(
      result.ok
        ? 'Quick model complete. Delta panel updated (delta is not a pick).'
        : 'Quick model unavailable; market-only terminal view remains available.'
    );
  };

  const openGame = async (game: LiveGame) => {
    const outcome = await runUiAction({
      actionName: 'open_live_game',
      traceId: currentTraceId,
      properties: { game_id: game.gameId, sport: game.sport },
      execute: async () => {
        router.push(
          buildNavigationHref({
            pathname: `/live/${encodeURIComponent(game.gameId)}`,
            traceId: currentTraceId,
            params: { sport: game.sport }
          })
        );
        return { ok: true, data: game, source: 'live' as const };
      }
    });
    if (!outcome.ok) setStatus('Unable to open game details; retry from cached rows.');
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h1 className="text-2xl font-semibold">Live Market Terminal</h1>
      <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
        <p className="font-medium text-slate-100">Market Pulse</p>
        <p>
          Source: {freshness.source}
          {freshness.asOfIso ? ` · As of ${new Date(freshness.asOfIso).toLocaleTimeString()}` : ''}
        </p>
        <div className="mt-1 flex gap-2">
          {freshness.stale ? (
            <span className="rounded border border-amber-500/60 px-2 py-0.5 text-[11px] text-amber-300">
              STALE
            </span>
          ) : null}
          {freshness.degraded ? (
            <span className="rounded border border-orange-500/60 px-2 py-0.5 text-[11px] text-orange-300">
              DEGRADED
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-slate-400">{status}</p>

      <div className="flex flex-wrap gap-2">
        {SPORTS.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded px-3 py-1.5 text-sm ${item === sport ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            onClick={() => setSport(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {games.length === 0 ? (
        <p className="rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
          No live market rows returned. Try another sport or continue with deterministic demo rows
          via the tabs.
        </p>
      ) : null}

      <ul className="space-y-3">
        {games.map((game) => {
          const deltaHome = game.model ? game.model.modelHome - game.implied.home : null;
          return (
            <li key={game.gameId} className="rounded border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => openGame(game)} className="text-left">
                  <p className="text-sm font-medium">{game.label}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(game.startsAt).toLocaleString()}
                  </p>
                </button>
                <span className="rounded border border-amber-500/60 px-2 py-0.5 text-[11px] text-amber-300">
                  {game.source}
                  {game.degraded ? ' · DEGRADED' : ''}
                </span>
              </div>

              <div className="mt-2 grid gap-2 text-xs md:grid-cols-3">
                <p>
                  Market implied H/A: <strong>{asPercent(game.implied.home)}</strong> /{' '}
                  <strong>{asPercent(game.implied.away)}</strong>
                </p>
                <p>
                  Model implied H/A:{' '}
                  {game.model ? (
                    <>
                      <strong>{asPercent(game.model.modelHome)}</strong> /{' '}
                      <strong>{asPercent(game.model.modelAway)}</strong>
                    </>
                  ) : (
                    'Model pending'
                  )}
                </p>
                <p title="Delta is not a pick. It reflects market-model probability difference only.">
                  Delta (home, not a pick):{' '}
                  {deltaHome == null
                    ? '—'
                    : `${deltaHome >= 0 ? '+' : ''}${(deltaHome * 100).toFixed(1)}%`}
                </p>
              </div>

              <div className="mt-3 flex gap-2">
                {!game.model ? (
                  <button
                    type="button"
                    onClick={() => runQuickModel(game)}
                    className="rounded bg-indigo-600 px-3 py-1.5 text-xs"
                  >
                    Run quick model pass
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openGame(game)}
                  className="rounded border border-slate-700 px-3 py-1.5 text-xs"
                >
                  Open detail
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
