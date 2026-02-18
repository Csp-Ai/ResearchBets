import { randomUUID } from 'node:crypto';

import { DbEventEmitter } from '../control-plane/emitter';
import { buildInsightNode } from '../insights/insightGraph';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';
import type { MarketGame } from '../markets/marketData';

const QUICK_MODEL_TTL_MS = 5 * 60_000;

interface QuickModelSnapshot {
  gameId: string;
  sport: string;
  modelHome: number;
  modelAway: number;
  generatedAt: string;
  traceId: string;
  runId: string;
  source: 'cache' | 'demo';
}

const quickModelCache = new Map<string, QuickModelSnapshot>();

const clamp = (value: number): number => Math.max(0.05, Math.min(0.95, Number(value.toFixed(4))));

const hashDelta = (seed: string): number => {
  let acc = 0;
  for (let idx = 0; idx < seed.length; idx += 1)
    acc = (acc + seed.charCodeAt(idx) * (idx + 3)) % 1000;
  return ((acc % 21) - 10) / 1000;
};

async function emitEvent(input: {
  eventName:
    | 'market_snapshot_loaded'
    | 'model_snapshot_loaded'
    | 'delta_computed'
    | 'model_quickrun_started'
    | 'model_quickrun_succeeded'
    | 'model_quickrun_failed'
    | 'insight_node_created'
    | 'live_games_opened'
    | 'live_game_opened';
  traceId: string;
  runId: string;
  requestId?: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  await new DbEventEmitter(getRuntimeStore()).emit({
    event_name: input.eventName,
    timestamp: new Date().toISOString(),
    request_id: input.requestId ?? randomUUID(),
    trace_id: input.traceId,
    run_id: input.runId,
    session_id: 'anon',
    user_id: null,
    agent_id: 'live-games',
    model_version: 'live-v0',
    properties: input.properties ?? {}
  });
}

async function persistNode(input: ReturnType<typeof buildInsightNode>): Promise<void> {
  await getRuntimeStore().saveInsightNode({
    insightId: input.insight_id,
    traceId: input.trace_id,
    runId: input.run_id,
    gameId: input.game_id,
    agentKey: input.agent_key,
    track: input.track,
    insightType: input.insight_type,
    claim: input.claim,
    evidence: input.evidence,
    confidence: input.confidence,
    timestamp: input.timestamp,
    decayHalfLifeMinutes: input.decay_half_life_minutes,
    marketImplied: input.market_implied,
    modelImplied: input.model_implied,
    delta: input.delta
  });

  await emitEvent({
    eventName: 'insight_node_created',
    traceId: input.trace_id,
    runId: input.run_id,
    properties: {
      game_id: input.game_id,
      insight_type: input.insight_type,
      insight_id: input.insight_id
    }
  });
}

export async function recordMarketLoaded(input: {
  games: MarketGame[];
  traceId: string;
  runId: string;
  sport: string;
  source: string;
}): Promise<void> {
  await emitEvent({
    eventName: 'market_snapshot_loaded',
    traceId: input.traceId,
    runId: input.runId,
    properties: { sport: input.sport, game_count: input.games.length, source: input.source }
  });

  for (const game of input.games) {
    const node = buildInsightNode({
      traceId: input.traceId,
      runId: input.runId,
      gameId: game.gameId,
      agentKey: 'market_loader',
      track: 'baseline',
      insightType: 'line_move',
      claim: `Market snapshot for ${game.label} from ${game.source}.`,
      confidence: game.degraded ? 0.52 : 0.7,
      marketImplied: game.implied.home,
      evidence: [
        {
          source: game.source,
          snippet: `moneyline:${String(game.lines.homeMoneyline ?? 'n/a')}/${String(game.lines.awayMoneyline ?? 'n/a')}`
        }
      ]
    });
    await persistNode(node);
  }
}

export async function getOrRunQuickModel(input: {
  game: MarketGame;
  traceId: string;
}): Promise<QuickModelSnapshot> {
  const cacheKey = input.game.gameId;
  const cached = quickModelCache.get(cacheKey);
  if (cached && Date.now() - new Date(cached.generatedAt).getTime() <= QUICK_MODEL_TTL_MS)
    return { ...cached, source: 'cache' };

  const runId = `quickmodel_${randomUUID()}`;
  await emitEvent({
    eventName: 'model_quickrun_started',
    traceId: input.traceId,
    runId,
    properties: { game_id: input.game.gameId }
  });

  try {
    const delta = hashDelta(input.game.gameId + input.game.sport);
    const modelHome = clamp(input.game.implied.home + delta);
    const modelAway = clamp(1 - modelHome);

    const snapshot: QuickModelSnapshot = {
      gameId: input.game.gameId,
      sport: input.game.sport,
      modelHome,
      modelAway,
      generatedAt: new Date().toISOString(),
      traceId: input.traceId,
      runId,
      source: 'demo'
    };

    quickModelCache.set(cacheKey, snapshot);

    await emitEvent({
      eventName: 'model_snapshot_loaded',
      traceId: input.traceId,
      runId,
      properties: { game_id: snapshot.gameId, source: snapshot.source }
    });
    await emitEvent({
      eventName: 'delta_computed',
      traceId: input.traceId,
      runId,
      properties: {
        game_id: snapshot.gameId,
        delta_home: Number((snapshot.modelHome - input.game.implied.home).toFixed(4))
      }
    });

    const modelNode = buildInsightNode({
      traceId: input.traceId,
      runId,
      gameId: input.game.gameId,
      agentKey: 'quick_model',
      track: 'hybrid',
      insightType: 'matchup_stat',
      claim: `Quick model estimated probabilities for ${input.game.label}.`,
      confidence: 0.58,
      modelImplied: snapshot.modelHome,
      evidence: [
        { source: 'quick-model', snippet: `home:${snapshot.modelHome} away:${snapshot.modelAway}` }
      ]
    });
    await persistNode(modelNode);

    const deltaNode = buildInsightNode({
      traceId: input.traceId,
      runId,
      gameId: input.game.gameId,
      agentKey: 'delta_engine',
      track: 'hybrid',
      insightType: 'market_delta',
      claim: 'Delta is not a pick; it is a market-model probability difference.',
      confidence: 0.61,
      marketImplied: input.game.implied.home,
      modelImplied: snapshot.modelHome,
      evidence: [
        {
          source: 'delta',
          snippet: `delta:${Number((snapshot.modelHome - input.game.implied.home).toFixed(4))}`
        }
      ]
    });
    await persistNode(deltaNode);

    await emitEvent({
      eventName: 'model_quickrun_succeeded',
      traceId: input.traceId,
      runId,
      properties: { game_id: input.game.gameId, cached: false }
    });

    return snapshot;
  } catch (error) {
    await emitEvent({
      eventName: 'model_quickrun_failed',
      traceId: input.traceId,
      runId,
      properties: {
        game_id: input.game.gameId,
        error: error instanceof Error ? error.message : 'unknown'
      }
    });
    throw error;
  }
}

export function getCachedQuickModel(gameId: string): QuickModelSnapshot | null {
  const cached = quickModelCache.get(gameId);
  if (!cached) return null;
  if (Date.now() - new Date(cached.generatedAt).getTime() > QUICK_MODEL_TTL_MS) return null;
  return { ...cached, source: 'cache' };
}

export async function emitLivePageEvent(input: {
  eventName: 'live_games_opened' | 'live_game_opened';
  traceId: string;
  runId: string;
  sport?: string;
  gameId?: string;
}): Promise<void> {
  await emitEvent({
    eventName: input.eventName,
    traceId: input.traceId,
    runId: input.runId,
    properties: { sport: input.sport, game_id: input.gameId }
  });
}
