'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  AgentNodeGraph,
  GRAPH_NODES,
  reconstructGraphState,
  type ControlPlaneEvent
} from '@/src/components/AgentNodeGraph';
import { DecisionBoardHeader } from '@/src/components/bettor/DecisionBoardHeader';
import { LegTable } from '@/src/components/bettor/LegTable';
import { FixSlipDrawer } from '@/src/components/bettor/FixSlipDrawer';
import type { SlipLeg } from '@/src/components/bettor/bettorDerivations';
import { EvidenceDrawer } from '@/src/components/EvidenceDrawer';
import { TraceReplayControls } from '@/src/components/TraceReplayControls';
import { DecisionCard, type DecisionCardData } from '@/src/components/DecisionCard';
import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { validateCopyPolicyInDev } from '@/src/core/policy/copyPolicyDevValidator';
import { runUiAction } from '@/src/core/ui/actionContract';
import { buildNavigationHref } from '@/src/core/ui/navigation';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';
import { PageHeader } from '@/src/components/terminal/PageHeader';
import { RightRailInspector } from '@/src/components/terminal/RightRailInspector';
import { StatusBadge } from '@/src/components/terminal/TrustPrimitives';
import { RunHeaderStrip } from '@/src/components/terminal/RunHeaderStrip';
import { asRecord, deriveInspectorSummary } from '@/src/components/terminal/eventDerivations';

type GameRow = {
  gameId: string;
  label: string;
  league: string;
  startsAt: string;
  source: 'live' | 'demo';
};

type InsightBucketKey =
  | 'topTakeaways'
  | 'injuries'
  | 'lineMovement'
  | 'matchupStats'
  | 'context'
  | 'weather'
  | 'notes';

const RESEARCH_PAGE_COPY = [
  'Found {n} games for terminal review ({source}).',
  'Showing best available demo games for terminal review.',
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
  'Market search (falls through to best-available demo games for terminal continuity)'
] as const;

function parseLegs(rawLegs: string | null): SlipLeg[] {
  if (!rawLegs) return [];
  try {
    const parsed = JSON.parse(rawLegs) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      .map((row, index) => ({
        id: typeof row.id === 'string' ? row.id : `leg-${index}`,
        selection: String(row.selection ?? `Leg ${index + 1}`),
        market: typeof row.market === 'string' ? row.market : undefined,
        odds: typeof row.odds === 'string' ? row.odds : undefined,
        line: typeof row.line === 'string' ? row.line : undefined
      }));
  } catch {
    return [];
  }
}

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

function bucketKey(event: ControlPlaneEvent): InsightBucketKey {
  const lower = event.event_name.toLowerCase();
  if (lower.includes('injury')) return 'injuries';
  if (lower.includes('line') || lower.includes('odds') || lower.includes('movement')) return 'lineMovement';
  if (lower.includes('stat') || lower.includes('matchup')) return 'matchupStats';
  if (lower.includes('coach') || lower.includes('context')) return 'context';
  if (lower.includes('weather')) return 'weather';
  return 'notes';
}

function takeaways(events: ControlPlaneEvent[]): string[] {
  return events
    .slice(-10)
    .reverse()
    .map((event) => {
      const payload = asRecord(event.payload);
      if (typeof payload.rationale === 'string' && payload.rationale.trim().length > 0) {
        return payload.rationale;
      }
      return event.event_name.replaceAll('_', ' ');
    })
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 3);
}

function ResearchPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const snapshotId = search.get('snapshotId') ?? '';
  const traceId = search.get('trace_id') ?? '';
  const slipId = search.get('slip_id');
  const [localTraceId] = useState(() => traceId || createClientRequestId());
  const chainTraceId = traceId || localTraceId;
  const [status, setStatus] = useState('');
  const [advancedView, setAdvancedView] = useState(false);
  const [inspectorExpanded, setInspectorExpanded] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [progress, setProgress] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fixSlipOpen, setFixSlipOpen] = useState(false);
  const [searchText, setSearchText] = useState('NFL');
  const [games, setGames] = useState<GameRow[]>([]);
  const [activeGame, setActiveGame] = useState<GameRow | null>(null);
  const [legs, setLegs] = useState<SlipLeg[]>(() => parseLegs(search.get('legs')));
  const showExploreDrawer = search.get('demo') === '1';

  const { events, loading, error, refresh } = useTraceEvents({
    traceId: chainTraceId,
    limit: 180,
    pollIntervalMs: 2000,
    enabled: liveMode
  });

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
    if (!slipId || typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(`rb-slip-${slipId}`);
    if (!stored) return;
    const parsed = parseLegs(JSON.stringify((JSON.parse(stored) as { legs?: unknown[] }).legs ?? []));
    if (parsed.length > 0) setLegs(parsed);
  }, [slipId]);

  useEffect(() => {
    void runUiAction({
      actionName: 'game_search',
      traceId: chainTraceId,
      execute: async () => {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchText)}`);
        const payload = (await res.json()) as { games?: GameRow[]; source?: 'live' | 'demo'; degraded?: boolean };
        const rows = payload.games ?? [];
        setGames(rows);
        if (rows.length > 0 && !activeGame) setActiveGame(rows[0] ?? null);
        return { ok: true, data: rows, source: payload.source ?? 'demo', degraded: payload.degraded ?? false };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const graphState = useMemo(() => reconstructGraphState(events, liveMode ? undefined : replayTimestamp), [events, liveMode, replayTimestamp]);
  const selectedNode = GRAPH_NODES.find((node) => node.id === selectedNodeId);
  const inspectorSummary = useMemo(() => deriveInspectorSummary(events), [events]);

  const sections = useMemo(() => {
    const buckets: Record<InsightBucketKey, ControlPlaneEvent[]> = {
      topTakeaways: [],
      injuries: [],
      lineMovement: [],
      matchupStats: [],
      context: [],
      weather: [],
      notes: []
    };

    for (const event of [...events].reverse()) {
      buckets[bucketKey(event)].push(event);
    }

    return {
      topTakeaways: takeaways(events),
      injuries: buckets.injuries.slice(0, 5),
      lineMovement: buckets.lineMovement.slice(0, 5),
      matchupStats: buckets.matchupStats.slice(0, 5),
      context: buckets.context.slice(0, 5),
      weather: buckets.weather.slice(0, 5),
      notes: buckets.notes.slice(0, 5)
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
    const scoreRaw = asRecord(latestDecisionPayload).score;
    const confidence = typeof scoreRaw === 'number' ? scoreRaw : null;
    const riskTag = typeof asRecord(latestDecisionPayload).risk_tag === 'string' ? String(asRecord(latestDecisionPayload).risk_tag) : null;
    const rationale = typeof asRecord(latestDecisionPayload).rationale === 'string' ? String(asRecord(latestDecisionPayload).rationale) : undefined;

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
    const outcome = await runUiAction({ actionName: 'game_search', traceId: chainTraceId, execute: async () => {
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchText)}`);
      if (!res.ok) return { ok: false, error_code: 'search_failed', source: 'demo' as const };
      const payload = (await res.json()) as { games?: GameRow[]; source?: 'live' | 'demo'; degraded?: boolean };
      const rows = payload.games ?? [];
      setGames(rows);
      if (rows.length > 0) setActiveGame(rows[0] ?? null);
      setStatus(rows.length > 0 ? `Found ${rows.length} games for terminal review (${payload.source ?? 'demo'}).` : 'Showing best available demo games for terminal review.');
      return { ok: true, data: rows, source: payload.source ?? 'demo', degraded: payload.degraded ?? false };
    }});
    if (!outcome.ok) setStatus('Search failed. Showing cached/demo games for terminal review.');
  };

  const selectGame = async (game: GameRow) => {
    const outcome = await runUiAction({ actionName: 'select_game_row', traceId: chainTraceId, properties: { game_id: game.gameId, league: game.league }, execute: async () => {
      const res = await fetch(`/api/games/${encodeURIComponent(game.gameId)}`);
      const payload = await res.json();
      const selected = (payload.game ?? game) as GameRow;
      setActiveGame(selected);
      router.push(buildNavigationHref({ pathname: '/research', traceId: chainTraceId, params: { snapshotId: snapshotId || selected.gameId } }));
      return { ok: true, data: selected, source: (payload.source ?? game.source) as 'live' | 'demo', degraded: payload.source === 'demo' };
    }});
    if (!outcome.ok) setStatus('Unable to select game in terminal right now.');
  };

  const submit = async (formData: FormData) => {
    const anonSessionId = ensureAnonSessionId();
    const bet = { sessionId: anonSessionId, userId: anonSessionId, snapshotId: snapshotId || activeGame?.gameId || 'DEMO', traceId: chainTraceId, runId: createClientRequestId(), selection: formData.get('selection')?.toString() ?? 'Unknown', oddsFormat: 'decimal' as const, price: Number(formData.get('odds') ?? 1.91), stake: Number(formData.get('stake') ?? 100), confidence: Number(formData.get('confidence') ?? 0.65), idempotencyKey: createClientRequestId(), gameId: activeGame?.gameId ?? null };
    const tracked = await runUiAction({ actionName: 'track_bet_cta', traceId: bet.traceId, properties: { game_id: bet.gameId }, execute: async () => {
      const response = await fetch('/api/bets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bet) });
      if (!response.ok) return { ok: false, source: 'live' as const, error_code: 'track_bet_failed' };
      return { ok: true, source: 'live' as const, data: await response.json() };
    }});
    setStatus(tracked.ok ? 'Position logged for research analysis.' : 'Failed to log position.');
  };

  const runAnalysis = async () => {
    const outcome = await runUiAction({ actionName: 'run_analysis', traceId: chainTraceId, properties: { game_id: activeGame?.gameId, league: activeGame?.league }, execute: async () => {
      const anonSessionId = ensureAnonSessionId();
      const response = await fetch('/api/researchSnapshot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: activeGame?.gameId ?? 'NFL_DEMO_1', sessionId: anonSessionId, userId: anonSessionId, tier: 'free', seed: 'demo-seed', requestId: createClientRequestId() }) });
      const data = await response.json();
      if (!response.ok) return { ok: false, source: 'demo' as const, error_code: 'analysis_failed' };
      router.push(buildNavigationHref({ pathname: '/research', traceId: data.traceId, params: { snapshotId: data.snapshotId } }));
      setStatus(`Research run started for ${activeGame?.label ?? activeGame?.gameId ?? 'demo game'}.`);
      return { ok: true, data, source: 'live' as const };
    }});
    if (!outcome.ok) setStatus('Research run unavailable. Retrying with demo context later.');
  };

  const shareView = async () => {
    const outcome = await runUiAction({ actionName: 'share_card_export', traceId: chainTraceId, execute: async () => {
      const url = typeof window !== 'undefined' ? window.location.href : `/research?snapshotId=${snapshotId}`;
      await navigator.clipboard.writeText(url);
      setStatus('Share link copied to clipboard.');
      return { ok: true, data: { url }, source: 'live' as const };
    }});
    if (!outcome.ok) setStatus('Unable to copy share card link.');
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Research Workspace"
        subtitle="Decision-first board with verdict, ranked legs, and advanced trace inspection."
        actions={<StatusBadge status={loading ? 'running' : error ? 'error' : events.length > 0 ? 'complete' : 'waiting'} />}
      />

      <RunHeaderStrip traceId={chainTraceId || null} events={events} onRefresh={() => void refresh()} viewTraceHref={`/traces/${encodeURIComponent(chainTraceId)}`} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <DecisionBoardHeader
            traceId={chainTraceId}
            legs={legs}
            events={events}
            onFixSlip={() => setFixSlipOpen(true)}
            onRerunResearch={() => void runAnalysis()}
          />

          <FixSlipDrawer
            open={fixSlipOpen}
            legs={legs}
            onClose={() => setFixSlipOpen(false)}
            onLegsChange={setLegs}
            onRerunResearch={() => {
              setFixSlipOpen(false);
              void runAnalysis();
            }}
          />

          <LegTable legs={legs} events={events} traceId={chainTraceId} onLegsChange={setLegs} />

          {showExploreDrawer ? <div className="rounded border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">Market search (falls through to best-available demo games for terminal continuity)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="flex-1 rounded bg-slate-900 p-2 text-sm" placeholder="Search games or leagues" />
              <button type="button" onClick={runSearch} className="rounded bg-cyan-600 px-3 py-2 text-sm">Search market</button>
              <button type="button" onClick={() => void runAnalysis()} className="rounded bg-indigo-600 px-3 py-2 text-sm">Rerun research</button>
              <button type="button" onClick={() => void shareView()} className="rounded border border-slate-700 px-3 py-2 text-sm">Share</button>
            </div>
            <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs">
              {games.map((game) => (
                <li key={game.gameId}><button type="button" onClick={() => void selectGame(game)} className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-left hover:border-cyan-400/60">{game.label} · {game.league} · {game.gameId} · {game.source}</button></li>
              ))}
            </ul>
          </div> : null}

          <InsightSection title="Top Takeaways" openByDefault items={sections.topTakeaways.map((row) => ({ label: row }))} traceId={chainTraceId} />
          <InsightSection title="Injuries / Availability" items={sections.injuries.map((event) => ({ label: event.event_name, event }))} traceId={chainTraceId} />
          <InsightSection title="Line Movement" items={sections.lineMovement.map((event) => ({ label: event.event_name, event }))} traceId={chainTraceId} />
          <InsightSection title="Matchup Stats" items={sections.matchupStats.map((event) => ({ label: event.event_name, event }))} traceId={chainTraceId} />
          <InsightSection title="Context / Coaching" items={sections.context.map((event) => ({ label: event.event_name, event }))} traceId={chainTraceId} />
          <InsightSection title="Weather" items={sections.weather.map((event) => ({ label: event.event_name, event }))} traceId={chainTraceId} />
          <InsightSection title="Notes / Raw" items={sections.notes.map((event) => ({ label: event.event_name, event }))} traceId={chainTraceId} />

          <details className="rounded border border-slate-800 bg-slate-900 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Log + Advanced controls</summary>
            <form action={submit} className="mt-3 grid gap-2 text-sm">
              <input className="rounded bg-slate-950 p-2" name="selection" placeholder="Position label" defaultValue="BOS -3.5" />
              <input className="rounded bg-slate-950 p-2" name="odds" placeholder="Decimal odds" defaultValue="1.91" />
              <input className="rounded bg-slate-950 p-2" name="stake" placeholder="Stake" defaultValue="100" />
              <input className="rounded bg-slate-950 p-2" name="confidence" placeholder="Model confidence" defaultValue="0.68" />
              <button type="submit" className="rounded bg-sky-600 px-3 py-2 font-medium">Log position</button>
            </form>
            <p className="mt-2 text-xs text-slate-400">{status}</p>
            <div className="mt-3"><DecisionCard data={researchDecisionCard} /></div>

            <button type="button" onClick={() => setAdvancedView((current) => !current)} className="mt-3 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/70" aria-pressed={advancedView}>
              {advancedView ? 'Hide Advanced Trace' : 'Advanced Trace'}
            </button>

            {advancedView ? (
              <div className="mt-4 space-y-3">
                <TraceReplayControls isLive={liveMode} isPlaying={isPlaying} speed={speed} progress={progress} disabled={events.length === 0} onLiveToggle={setLiveMode} onPlayPause={() => setIsPlaying((value) => !value)} onSpeedChange={setSpeed} onProgressChange={(value) => { setLiveMode(false); setProgress(value); }} />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="overflow-x-auto"><AgentNodeGraph traceId={chainTraceId} events={events} state={graphState} selectedNodeId={selectedNodeId} onNodeSelect={(nodeId) => { setSelectedNodeId(nodeId); setDrawerOpen(true); }} showDemoLabel={false} /></div>
                  <aside className="rounded-xl border border-slate-800 bg-slate-950/80 p-3"><h3 className="text-sm font-semibold text-slate-100">Recent events</h3><ul className="mt-2 max-h-[280px] space-y-2 overflow-y-auto text-xs">{events.slice(-20).reverse().map((event, index) => (<li key={`${event.event_name}-${event.created_at ?? index}`}><button type="button" className="w-full rounded border border-slate-800 bg-slate-900/70 px-2 py-1 text-left text-slate-300 hover:border-cyan-400/50" onClick={() => { const agent = String((event.payload?.agent_id ?? '') || ''); const mapped = agent && GRAPH_NODES.some((node) => node.id === agent) ? agent : undefined; setSelectedNodeId(mapped ?? selectedNodeId ?? 'decision'); setDrawerOpen(true); }}><p className="truncate">{event.event_name}</p></button></li>))}</ul></aside>
                </div>
                <EvidenceDrawer open={drawerOpen} node={selectedNode} events={events} onClose={() => setDrawerOpen(false)} />
              </div>
            ) : null}
          </details>
        </section>

        <aside className="space-y-3">
          <button type="button" onClick={() => setInspectorExpanded((value) => !value)} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
            {inspectorExpanded ? 'Hide Advanced Inspector' : 'Advanced Inspector'}
          </button>
          {inspectorExpanded ? (
            <RightRailInspector traceId={chainTraceId || null} runId={snapshotId || null} sessionId={null} loading={loading} error={error} summary={inspectorSummary} />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
              Advanced trace inspector is collapsed by default. Expand when you want full provenance and warnings.
              <div className="mt-2"><Link href={`/traces/${encodeURIComponent(chainTraceId)}`} className="text-cyan-300 underline">View Trace</Link></div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function InsightSection({ title, items, traceId, openByDefault = false }: { title: string; items: Array<{ label: string; event?: ControlPlaneEvent }>; traceId: string; openByDefault?: boolean; }) {
  return (
    <details open={openByDefault} className="rounded border border-slate-800 bg-slate-950/50 p-2">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      {items.length === 0 ? <p className="mt-2 text-xs text-slate-500">Run research to generate a verdict.</p> : (
        <ul className="mt-2 space-y-1 text-xs">
          {items.slice(0, 5).map((item, index) => {
            const payload = asRecord(item.event?.payload);
            const agent = typeof payload.agent_id === 'string' ? payload.agent_id : null;
            const href = item.event ? `/traces/${encodeURIComponent(traceId)}?event_name=${encodeURIComponent(item.event.event_name)}${agent ? `&agent_id=${encodeURIComponent(agent)}` : ''}` : `/traces/${encodeURIComponent(traceId)}`;
            return <li key={`${title}-${item.label}-${index}`} className="rounded border border-slate-800 px-2 py-1">{item.label} <Link href={href} className="ml-2 text-cyan-300 underline">View in Trace</Link></li>;
          })}
        </ul>
      )}
    </details>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={null}>
      <ResearchPageContent />
    </Suspense>
  );
}
