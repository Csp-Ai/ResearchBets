'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  AgentNodeGraph,
  GRAPH_NODES,
  reconstructGraphState,
  type ControlPlaneEvent
} from '@/src/components/AgentNodeGraph';
import { EvidenceDrawer } from '@/src/components/EvidenceDrawer';
import { TerminalLoopShell } from '@/src/components/TerminalLoopShell';
import { TraceReplayControls } from '@/src/components/TraceReplayControls';
import { DecisionCard, type DecisionCardData } from '@/src/components/DecisionCard';
import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { validateCopyPolicyInDev } from '@/src/core/policy/copyPolicyDevValidator';
import { runUiAction } from '@/src/core/ui/actionContract';
import { buildNavigationHref } from '@/src/core/ui/navigation';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';
import { EmptyState } from '@/src/components/terminal/AsyncState';
import { PageHeader } from '@/src/components/terminal/PageHeader';
import { RightRailInspector } from '@/src/components/terminal/RightRailInspector';
import { StatusBadge, TraceBadge } from '@/src/components/terminal/TrustPrimitives';

type GameRow = {
  gameId: string;
  label: string;
  league: string;
  startsAt: string;
  source: 'live' | 'demo';
};


const RESEARCH_PAGE_COPY = [
  'Found {n} games for terminal review ({source}).',
  'Showing best available demo games for research terminal review.',
  'Search failed. Showing cached/demo games for terminal review.',
  'Unable to select game in terminal right now.',
  'Position logged for research analysis.',
  'Failed to log position.',
  'Research run started for {game}.',
  'Research run unavailable. Retrying with demo context later.',
  'Unable to open Live Market Terminal right now.',
  'Share link copied to clipboard.',
  'Unable to copy share card link.',
  'Research output supports decisions; it is not deterministic advice.',
  'Market search (falls through to best-available demo games for terminal continuity)',
  'Waiting for trace events…'
] as const;

function toProgressTimestamp(events: ControlPlaneEvent[], progress: number): number {
  if (events.length === 0) return Date.now();
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  );
  const start = new Date(sorted[0]?.created_at ?? 0).getTime();
  const end = new Date(sorted.at(-1)?.created_at ?? 0).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return end || Date.now();
  return start + ((end - start) * progress) / 100;
}

function ResearchPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const snapshotId = search.get('snapshotId') ?? '';
  const traceId = search.get('trace_id') ?? '';
  const replayMode = search.get('replay') === '1';
  const [localTraceId] = useState(() => traceId || createClientRequestId());
  const chainTraceId = traceId || localTraceId;
  const [status, setStatus] = useState('');
  const [advancedView, setAdvancedView] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [progress, setProgress] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('NFL');
  const [games, setGames] = useState<GameRow[]>([]);
  const [activeGame, setActiveGame] = useState<GameRow | null>(null);

  const { events, loading, error } = useTraceEvents({
    traceId: chainTraceId,
    limit: 180,
    pollIntervalMs: 2000,
    enabled: liveMode
  });

  const hasTraceId = Boolean(chainTraceId);
  const usingDemo = !hasTraceId;

  useEffect(() => {
    validateCopyPolicyInDev([
      {
        id: 'research.page',
        surface: 'research',
        file: 'app/research/page.tsx',
        strings: RESEARCH_PAGE_COPY
      }
    ]);
  }, []);

  useEffect(() => {
    void runUiAction({
      actionName: 'game_search',
      traceId: chainTraceId,
      execute: async () => {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchText)}`);
        const payload = (await res.json()) as {
          games?: GameRow[];
          source?: 'live' | 'demo';
          degraded?: boolean;
        };
        const rows = payload.games ?? [];
        setGames(rows);
        if (rows.length > 0 && !activeGame) setActiveGame(rows[0] ?? null);
        return {
          ok: true,
          data: rows,
          source: payload.source ?? 'demo',
          degraded: payload.degraded ?? false
        };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!replayMode) return;
    setAdvancedView(true);
    setLiveMode(false);
    setProgress(0);
  }, [replayMode]);

  useEffect(() => {
    if (liveMode) {
      setProgress(100);
      setIsPlaying(false);
    }
  }, [liveMode]);

  useEffect(() => {
    if (liveMode || !isPlaying) return;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = value + speed * 2;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [isPlaying, liveMode, speed]);

  const replayTimestamp = useMemo(() => toProgressTimestamp(events, progress), [events, progress]);
  const graphState = useMemo(
    () => reconstructGraphState(events, liveMode ? undefined : replayTimestamp),
    [events, liveMode, replayTimestamp]
  );
  const selectedNode = GRAPH_NODES.find((node) => node.id === selectedNodeId);

  const inspectorSummary = useMemo(() => {
    const assumptions = new Set<string>();
    const sources = new Set<string>();
    const agents = new Map<string, { id: string; snippet: string; timestamp?: string }>();
    let confidence: number | null = null;
    let updatedAt: string | undefined;

    for (const event of events) {
      const payload = event.payload ?? {};
      const possibleAssumptions = payload.assumptions;
      if (Array.isArray(possibleAssumptions)) {
        possibleAssumptions.forEach((item) => assumptions.add(String(item)));
      }
      const possibleSources = payload.sources;
      if (Array.isArray(possibleSources)) {
        possibleSources.forEach((item) => sources.add(String(item)));
      }
      if (typeof payload.confidence === 'number') confidence = payload.confidence;
      if (typeof payload.agent_id === 'string') {
        agents.set(payload.agent_id, {
          id: payload.agent_id,
          snippet: JSON.stringify(payload, null, 2).slice(0, 500),
          timestamp: event.created_at,
        });
      }
      updatedAt = event.created_at ?? updatedAt;
    }

    return {
      confidence,
      assumptions: [...assumptions],
      sources: [...sources],
      agents: [...agents.values()],
      updatedAt,
      provenance: events.length > 0 ? ('Live' as const) : ('Demo' as const),
    };
  }, [events]);

  const latestDecisionPayload = useMemo(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event?.event_name === 'agent_scored_decision') return event.payload ?? {};
    }
    return {};
  }, [events]);

  const researchDecisionCard = useMemo<DecisionCardData>(() => {
    const scoreRaw = latestDecisionPayload.score;
    const confidence = typeof scoreRaw === 'number' ? scoreRaw : null;
    const riskTag =
      typeof latestDecisionPayload.risk_tag === 'string' ? latestDecisionPayload.risk_tag : null;
    const rationale =
      typeof latestDecisionPayload.rationale === 'string'
        ? latestDecisionPayload.rationale
        : undefined;

    return {
      title: activeGame ? `Terminal Decision Artifact · ${activeGame.label}` : 'Terminal Decision Artifact',
      confidence,
      volatilityTag: riskTag,
      volatilityReasons: rationale ? [rationale] : [],
      fragilityVariables: [],
      evidenceSources: activeGame ? [activeGame.source] : []
    };
  }, [activeGame, latestDecisionPayload]);

  const runSearch = async () => {
    const outcome = await runUiAction({
      actionName: 'game_search',
      traceId: chainTraceId,
      execute: async () => {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchText)}`);
        if (!res.ok) return { ok: false, error_code: 'search_failed', source: 'demo' as const };
        const payload = (await res.json()) as {
          games?: GameRow[];
          source?: 'live' | 'demo';
          degraded?: boolean;
        };
        const rows = payload.games ?? [];
        setGames(rows);
        if (rows.length > 0) setActiveGame(rows[0] ?? null);
        setStatus(
          rows.length > 0
            ? `Found ${rows.length} games for terminal review (${payload.source ?? 'demo'}).`
            : 'Showing best available demo games for research terminal review.'
        );
        return {
          ok: true,
          data: rows,
          source: payload.source ?? 'demo',
          degraded: payload.degraded ?? false
        };
      }
    });
    if (!outcome.ok) setStatus('Search failed. Showing cached/demo games for terminal review.');
  };

  const selectGame = async (game: GameRow) => {
    const outcome = await runUiAction({
      actionName: 'select_game_row',
      traceId: chainTraceId,
      properties: { game_id: game.gameId, league: game.league },
      execute: async () => {
        const res = await fetch(`/api/games/${encodeURIComponent(game.gameId)}`);
        const payload = await res.json();
        const selected = (payload.game ?? game) as GameRow;
        setActiveGame(selected);
        router.push(
          buildNavigationHref({
            pathname: '/research',
            traceId: chainTraceId,
            params: { snapshotId: snapshotId || selected.gameId }
          })
        );
        return {
          ok: true,
          data: selected,
          source: (payload.source ?? game.source) as 'live' | 'demo',
          degraded: payload.source === 'demo'
        };
      }
    });
    if (!outcome.ok) setStatus('Unable to select game in terminal right now.');
  };

  const submit = async (formData: FormData) => {
    const anonSessionId = ensureAnonSessionId();
    const bet = {
      sessionId: anonSessionId,
      userId: anonSessionId,
      snapshotId: snapshotId || activeGame?.gameId || 'DEMO',
      traceId: chainTraceId,
      runId: createClientRequestId(),
      selection: formData.get('selection')?.toString() ?? 'Unknown',
      oddsFormat: 'decimal' as const,
      price: Number(formData.get('odds') ?? 1.91),
      stake: Number(formData.get('stake') ?? 100),
      confidence: Number(formData.get('confidence') ?? 0.65),
      idempotencyKey: createClientRequestId(),
      gameId: activeGame?.gameId ?? null
    };

    const tracked = await runUiAction({
      actionName: 'track_bet_cta',
      traceId: bet.traceId,
      properties: { game_id: bet.gameId },
      execute: async () => {
        const response = await fetch('/api/bets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bet)
        });
        if (!response.ok)
          return { ok: false, source: 'live' as const, error_code: 'track_bet_failed' };
        return { ok: true, source: 'live' as const, data: await response.json() };
      }
    });

    setStatus(tracked.ok ? 'Position logged for research analysis.' : 'Failed to log position.');
  };

  const runAnalysis = async () => {
    const outcome = await runUiAction({
      actionName: 'run_analysis',
      traceId: chainTraceId,
      properties: { game_id: activeGame?.gameId, league: activeGame?.league },
      execute: async () => {
        const anonSessionId = ensureAnonSessionId();
        const response = await fetch('/api/researchSnapshot/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: activeGame?.gameId ?? 'NFL_DEMO_1',
            sessionId: anonSessionId,
            userId: anonSessionId,
            tier: 'free',
            seed: 'demo-seed',
            requestId: createClientRequestId()
          })
        });
        const data = await response.json();
        if (!response.ok)
          return { ok: false, source: 'demo' as const, error_code: 'analysis_failed' };
        router.push(
          buildNavigationHref({
            pathname: '/research',
            traceId: data.traceId,
            params: { snapshotId: data.snapshotId }
          })
        );
        setStatus(
          `Research run started for ${activeGame?.label ?? activeGame?.gameId ?? 'demo game'}.`
        );
        return { ok: true, data, source: 'live' as const };
      }
    });
    if (!outcome.ok) setStatus('Research run unavailable. Retrying with demo context later.');
  };

  const openLiveGames = async () => {
    const outcome = await runUiAction({
      actionName: 'see_live_games',
      traceId: chainTraceId,
      properties: { sport: activeGame?.league ?? 'NFL', game_id: activeGame?.gameId },
      execute: async () => {
        const targetSport = activeGame?.league ?? 'NFL';
        router.push(
          buildNavigationHref({ pathname: '/live', traceId: chainTraceId, params: { sport: targetSport } })
        );
        return { ok: true, source: 'live' as const };
      }
    });
    if (!outcome.ok) setStatus('Unable to open Live Market Terminal right now.');
  };

  const shareView = async () => {
    const outcome = await runUiAction({
      actionName: 'share_card_export',
      traceId: chainTraceId,
      execute: async () => {
        const url =
          typeof window !== 'undefined'
            ? window.location.href
            : `/research?snapshotId=${snapshotId}`;
        await navigator.clipboard.writeText(url);
        setStatus('Share link copied to clipboard.');
        return { ok: true, data: { url }, source: 'live' as const };
      }
    });
    if (!outcome.ok) setStatus('Unable to copy share card link.');
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Research Workspace"
        subtitle="Three-pane terminal: extracted legs, insights, and persistent trust inspector."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={loading ? 'running' : error ? 'error' : events.length > 0 ? 'complete' : 'waiting'} />
            <TraceBadge traceId={chainTraceId} />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_330px]">
        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold">Slip Legs Panel</h2>
          <p className="text-xs text-slate-400">Use ingest extraction output or manually curate legs for this run.</p>
          {activeGame ? (
            <div className="rounded border border-slate-700 bg-slate-950/70 p-2 text-xs">
              {activeGame.label} · {activeGame.league}
            </div>
          ) : (
            <EmptyState title="No extracted legs" description="Select a game or run ingest to attach legs." />
          )}
          <TerminalLoopShell traceId={chainTraceId} />
        </aside>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Research Terminal Log</h1>
        <p className="text-sm text-slate-400">
          Snapshot: {snapshotId || 'Not started'} · Trace: {traceId || 'Pending'} · Active game:{' '}
          {activeGame ? `${activeGame.label} (${activeGame.source})` : 'none'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Research output supports decisions; it is not deterministic advice.
        </p>

        <div className="mt-4 rounded border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-xs text-slate-400">
            Market search (falls through to best-available demo games for terminal continuity)
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="flex-1 rounded bg-slate-900 p-2 text-sm"
              placeholder="Search games or leagues"
            />
            <button
              type="button"
              onClick={runSearch}
              className="rounded bg-cyan-600 px-3 py-2 text-sm"
            >
              Search market
            </button>
            <button
              type="button"
              onClick={runAnalysis}
              className="rounded bg-indigo-600 px-3 py-2 text-sm"
            >
              Run research
            </button>
            <button
              type="button"
              onClick={shareView}
              className="rounded border border-slate-700 px-3 py-2 text-sm"
            >
              Share
            </button>
            <button
              type="button"
              onClick={openLiveGames}
              className="rounded bg-emerald-600 px-3 py-2 text-sm"
            >
              Open Live Terminal
            </button>
          </div>
          <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs">
            {games.map((game) => (
              <li key={game.gameId}>
                <button
                  type="button"
                  onClick={() => selectGame(game)}
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-left hover:border-cyan-400/60"
                >
                  {game.label} · {game.league} · {game.gameId} · {game.source}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setAdvancedView((current) => !current)}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/70"
            aria-pressed={advancedView}
          >
            {advancedView ? 'Hide Terminal Diagnostics' : 'Terminal Diagnostics'}
          </button>
        </div>
        <form action={submit} className="mt-4 grid gap-3 text-sm">
          <input
            className="rounded bg-slate-950 p-2"
            name="selection"
            placeholder="Position label"
            defaultValue="BOS -3.5"
          />
          <input
            className="rounded bg-slate-950 p-2"
            name="odds"
            placeholder="Decimal odds"
            defaultValue="1.91"
          />
          <input
            className="rounded bg-slate-950 p-2"
            name="stake"
            placeholder="Stake"
            defaultValue="100"
          />
          <input
            className="rounded bg-slate-950 p-2"
            name="confidence"
            placeholder="Model confidence"
            defaultValue="0.68"
          />
          <button type="submit" className="rounded bg-sky-600 px-3 py-2 font-medium">
            Log position
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">{status}</p>
        <div className="mt-4">
          <DecisionCard data={researchDecisionCard} />
        </div>

        {advancedView ? (
          <div className="mt-5 space-y-3">
            <TraceReplayControls
              isLive={liveMode}
              isPlaying={isPlaying}
              speed={speed}
              progress={progress}
              disabled={events.length === 0}
              onLiveToggle={setLiveMode}
              onPlayPause={() => setIsPlaying((value) => !value)}
              onSpeedChange={setSpeed}
              onProgressChange={(value) => {
                setLiveMode(false);
                setProgress(value);
              }}
            />

            {loading ? <p className="text-xs text-slate-400">Loading trace events…</p> : null}
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            {events.length === 0 ? (
              <p className="text-xs text-slate-400">Waiting for trace events…</p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-x-auto">
                <AgentNodeGraph
                  traceId={chainTraceId}
                  events={events}
                  state={graphState}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setDrawerOpen(true);
                  }}
                  showDemoLabel={usingDemo}
                />
              </div>

              <aside className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <h3 className="text-sm font-semibold text-slate-100">Recent events</h3>
                <ul className="mt-2 max-h-[460px] space-y-2 overflow-y-auto text-xs">
                  {events
                    .slice(-20)
                    .reverse()
                    .map((event, index) => (
                      <li key={`${event.event_name}-${event.created_at ?? index}`}>
                        <button
                          type="button"
                          className="w-full rounded border border-slate-800 bg-slate-900/70 px-2 py-1 text-left text-slate-300 hover:border-cyan-400/50"
                          onClick={() => {
                            const agent = String((event.payload?.agent_id ?? '') || '');
                            const mapped =
                              agent && GRAPH_NODES.some((node) => node.id === agent)
                                ? agent
                                : undefined;
                            setSelectedNodeId(mapped ?? selectedNodeId ?? 'decision');
                            setDrawerOpen(true);
                          }}
                        >
                          <p className="truncate">{event.event_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {event.created_at
                              ? new Date(event.created_at).toLocaleTimeString()
                              : 'N/A'}
                          </p>
                        </button>
                      </li>
                    ))}
                </ul>
              </aside>
            </div>

            <EvidenceDrawer
              open={drawerOpen}
              node={selectedNode}
              events={events}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        ) : null}
        </section>

        <RightRailInspector
          traceId={chainTraceId || null}
          runId={snapshotId || null}
          sessionId={null}
          loading={loading}
          error={error}
          summary={inspectorSummary}
        />
      </div>
    </section>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={null}>
      <ResearchPageContent />
    </Suspense>
  );
}
