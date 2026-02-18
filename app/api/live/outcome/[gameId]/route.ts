import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { InsightNodeSchema, MarketSnapshotSchema } from '@/src/core/contracts/terminalSchemas';
import { resolveGameFromRegistry } from '@/src/core/games/registry';
import { buildInsightNode } from '@/src/core/insights/insightGraph';
import { getCachedQuickModel } from '@/src/core/live/liveModel';
import { getMarketSnapshot } from '@/src/core/markets/marketData';
import { computeEdgeRealization } from '@/src/core/metrics/edgeRealization';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const TTL_MS = 5 * 60_000;
const outcomeCache = new Map<string, { expiresAt: number; value: Record<string, unknown> }>();

const deterministicScore = (gameId: string): { home: number; away: number } => {
  const hash = [...gameId].reduce((sum, char, idx) => sum + char.charCodeAt(0) * (idx + 1), 0);
  return { home: 84 + (hash % 28), away: 80 + ((hash * 7) % 26) };
};

export async function GET(request: Request, { params }: { params: { gameId: string } }) {
  const store = getRuntimeStore();
  const emitter = new DbEventEmitter(store);
  const { searchParams } = new URL(request.url);
  const registryGame = resolveGameFromRegistry(params.gameId);
  const sport = searchParams.get('sport') ?? registryGame?.league ?? 'NFL';
  const traceId = searchParams.get('trace_id') ?? randomUUID();
  const runId = `live_outcome_${randomUUID()}`;

  const cached = outcomeCache.get(params.gameId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value);
  }

  const snapshotResult = MarketSnapshotSchema.safeParse(await getMarketSnapshot({ sport }));
  if (!snapshotResult.success) {
    const fallbackSnapshot = MarketSnapshotSchema.safeParse(await getMarketSnapshot({ sport: 'NFL' }));
    const fallbackGame = fallbackSnapshot.success
      ? fallbackSnapshot.data.games.find((entry) => entry.gameId === params.gameId) ?? null
      : null;

    return NextResponse.json({
      ok: false,
      source: 'demo',
      degraded: true,
      error_code: 'schema_invalid',
      data: fallbackGame
        ? {
            gameId: params.gameId,
            finalScore: deterministicScore(params.gameId),
            winner: 'push'
          }
        : null
    });
  }

  const snapshot = snapshotResult.data;
  const game = snapshot.games.find((entry) => entry.gameId === params.gameId);
  if (!game)
    return NextResponse.json(
      { ok: false, source: 'demo', degraded: true, error_code: 'game_not_found' },
      { status: 404 }
    );

  const score = deterministicScore(params.gameId);
  const total = score.home + score.away;
  const spread = game.lines.spread ?? 0;
  const totalLine = game.lines.total ?? total;

  const winner = score.home === score.away ? 'push' : score.home > score.away ? 'home' : 'away';
  const spreadResult =
    spread === 0
      ? 'push'
      : score.home + spread > score.away
        ? 'home_cover'
        : score.home + spread < score.away
          ? 'away_cover'
          : 'push';
  const totalResult = total > totalLine ? 'over' : total < totalLine ? 'under' : 'push';

  const model = getCachedQuickModel(params.gameId);
  const marketImplied = game.implied.home;
  const modelImplied = model?.modelHome ?? game.implied.home;
  const closingLineDelta = Number(
    ((game.lines.homeMoneyline ?? 0) - ((game.lines.homeMoneyline ?? 0) + 6)).toFixed(4)
  );

  const edgeRealized = await computeEdgeRealization({
    gameId: params.gameId,
    traceId,
    runId,
    marketImplied,
    modelImplied,
    homeWon: winner === 'home',
    closingLineMovement: closingLineDelta
  });

  const outcomeNode = buildInsightNode({
    traceId,
    runId,
    gameId: params.gameId,
    agentKey: 'outcome_loader',
    track: 'baseline',
    insightType: 'outcome_snapshot',
    claim: `Final score ${score.home}-${score.away} (${winner}).`,
    confidence: 0.72,
    attribution: { source_book: game.source, model_version: 'live-v0' }
  });

  const validatedOutcomeNode = InsightNodeSchema.safeParse(outcomeNode);
  if (!validatedOutcomeNode.success) {
    return NextResponse.json({ ok: false, source: 'demo', degraded: true, error_code: 'schema_invalid' });
  }

  await store.saveInsightNode({
    insightId: outcomeNode.insight_id,
    traceId: outcomeNode.trace_id,
    runId: outcomeNode.run_id,
    gameId: outcomeNode.game_id,
    agentKey: outcomeNode.agent_key,
    track: outcomeNode.track,
    insightType: outcomeNode.insight_type,
    claim: outcomeNode.claim,
    evidence: outcomeNode.evidence,
    confidence: outcomeNode.confidence,
    timestamp: outcomeNode.timestamp,
    decayHalfLife: outcomeNode.decay_half_life,
    decayHalfLifeMinutes: outcomeNode.decay_half_life_minutes,
    attribution: {
      sourceBook: outcomeNode.attribution?.source_book,
      modelVersion: outcomeNode.attribution?.model_version
    },
    marketImplied: outcomeNode.market_implied,
    modelImplied: outcomeNode.model_implied,
    delta: outcomeNode.delta
  });

  await store.saveOutcomeSnapshot({
    gameId: params.gameId,
    winner,
    homeScore: score.home,
    awayScore: score.away,
    spreadResult,
    totalResult,
    closingLineDelta,
    completed: true,
    source: 'demo',
    computedAt: new Date().toISOString()
  });

  await emitter.emit({
    event_name: 'live_outcome_loaded',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: traceId,
    run_id: runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'live-games',
    model_version: 'live-v0',
    properties: { game_id: params.gameId, source: 'demo' }
  });
  await emitter.emit({
    event_name: 'edge_realized_computed',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: traceId,
    run_id: runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'metrics',
    model_version: 'live-v0',
    properties: { game_id: params.gameId, ...edgeRealized }
  });
  await emitter.emit({
    event_name: 'insight_graph_updated',
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    trace_id: traceId,
    run_id: runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'insights',
    model_version: 'live-v0',
    properties: { game_id: params.gameId, node_types: ['outcome_snapshot', 'edge_realized'] }
  });

  const response = {
    ok: true,
    data: {
      gameId: params.gameId,
      finalScore: score,
      winner,
      spreadResult,
      totalResult,
      closingLineDelta,
      marketImplied,
      modelImplied,
      delta: Number((modelImplied - marketImplied).toFixed(4)),
      edgeRealized
    },
    source: 'demo',
    degraded: false
  };

  outcomeCache.set(params.gameId, { value: response, expiresAt: Date.now() + TTL_MS });
  return NextResponse.json(response);
}
