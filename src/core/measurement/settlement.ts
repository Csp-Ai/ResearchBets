import { randomUUID } from 'node:crypto';

import type { EventEmitter } from '../control-plane/emitter';
import type { RuntimeStore, StoredBet } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

import { computeLineCLV, computePriceCLV } from './clv';
import { resolveClosingOdds } from './odds';

const settleOutcomeFromPayload = (
  selection: string,
  marketType: StoredBet['marketType'],
  line: number | null,
  payload: Record<string, unknown>,
): 'won' | 'lost' | 'push' | 'void' => {
  const homeScore = Number(payload.home_score ?? 0);
  const awayScore = Number(payload.away_score ?? 0);
  const selectionSide = selection.toLowerCase();
  const total = homeScore + awayScore;

  if (marketType === 'moneyline') {
    const homeWon = homeScore > awayScore;
    return selectionSide.includes('home') ? (homeWon ? 'won' : 'lost') : homeWon ? 'lost' : 'won';
  }

  if (marketType === 'total' && line != null) {
    if (selectionSide.includes('over')) {
      if (total === line) return 'push';
      return total > line ? 'won' : 'lost';
    }
    if (selectionSide.includes('under')) {
      if (total === line) return 'push';
      return total < line ? 'won' : 'lost';
    }
  }

  if (marketType === 'spread' && line != null) {
    const margin = selectionSide.includes('home') ? homeScore - awayScore : awayScore - homeScore;
    const adjusted = margin + line;
    if (adjusted === 0) return 'push';
    return adjusted > 0 ? 'won' : 'lost';
  }

  return 'void';
};

const settlementStatus = (outcome: 'won' | 'lost' | 'push' | 'void'): 'won' | 'lost' | 'void' | 'pending' =>
  outcome === 'push' ? 'void' : outcome;

export const settleRecommendation = async (
  recommendationId: string,
  requestContext: {
    requestId: string;
    traceId: string;
    runId: string;
    sessionId: string;
    userId: string;
    agentId: string;
    modelVersion: string;
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const recommendation = await store.getRecommendation(recommendationId);
  if (!recommendation) throw new Error(`Recommendation ${recommendationId} not found`);
  const result = await store.getGameResult(recommendation.gameId);
  if (!result) throw new Error(`Result for game ${recommendation.gameId} not found`);

  const closing = await resolveClosingOdds({
    gameId: recommendation.gameId,
    market: recommendation.market,
    selection: recommendation.selection,
    resultCompletedAt: result.completedAt,
    requestContext,
    emitter,
    store,
  });

  const outcome = settleOutcomeFromPayload(recommendation.selection, recommendation.marketType, recommendation.line, result.payload);
  const clvLine = computeLineCLV({ marketType: recommendation.marketType, placedLine: recommendation.line, closingLine: closing?.line ?? null });
  const clvPrice = computePriceCLV({ placedPrice: recommendation.price, closingPrice: closing?.price ?? null });

  await store.saveRecommendationOutcome({
    id: randomUUID(),
    recommendationId,
    gameId: recommendation.gameId,
    outcome,
    closingLine: closing?.line ?? null,
    closingPrice: closing?.price ?? null,
    clvLine,
    clvPrice,
    settledAt: new Date().toISOString(),
  });

  await emitter.emit({
    event_name: 'user_outcome_recorded',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: recommendation.agentId,
    model_version: recommendation.agentVersion,
    properties: {
      outcome_id: `recommendation_outcome_${recommendationId}`,
      bet_id: recommendationId,
      settlement_status: settlementStatus(outcome),
      pnl_amount: 0,
      odds: recommendation.price,
      settled_at: new Date().toISOString(),
    },
  });
};

export const settleBet = async (
  betId: string,
  requestContext: {
    requestId: string;
    traceId: string;
    runId: string;
    sessionId: string;
    userId: string;
    agentId: string;
    modelVersion: string;
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const bet = await store.getBet(betId);
  if (!bet) throw new Error(`Bet ${betId} not found`);
  if (!bet.gameId || !bet.marketType) throw new Error(`Bet ${betId} missing game_id or market_type`);

  const result = await store.getGameResult(bet.gameId);
  if (!result) throw new Error(`Result for game ${bet.gameId} not found`);

  const closing = await resolveClosingOdds({
    gameId: bet.gameId,
    market: bet.marketType,
    selection: bet.selection,
    resultCompletedAt: result.completedAt,
    requestContext,
    emitter,
    store,
  });

  bet.closingLine = closing?.line ?? null;
  bet.closingPrice = closing?.price ?? null;
  bet.clvLine = computeLineCLV({ marketType: bet.marketType, placedLine: bet.placedLine ?? bet.line ?? null, closingLine: bet.closingLine });
  bet.clvPrice = computePriceCLV({ placedPrice: bet.placedPrice ?? bet.odds, closingPrice: bet.closingPrice });
  const rawOutcome = settleOutcomeFromPayload(bet.selection, bet.marketType, bet.line ?? bet.placedLine ?? null, result.payload);
  bet.outcome = rawOutcome === 'void' ? 'push' : rawOutcome;
  bet.status = 'settled';
  bet.settledAt = new Date().toISOString();
  bet.settledProfit =
    bet.outcome === 'won' ? Number((bet.stake * ((bet.placedPrice ?? bet.odds) - 1)).toFixed(2)) : bet.outcome === 'lost' ? -bet.stake : 0;
  await store.saveBet(bet);

  if (bet.recommendedId) {
    await settleRecommendation(bet.recommendedId, requestContext, emitter, store);
  }

  await emitter.emit({
    event_name: 'user_outcome_recorded',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: {
      outcome_id: `bet_outcome_${bet.id}`,
      bet_id: bet.id,
      settlement_status: settlementStatus(bet.outcome ?? 'void'),
      pnl_amount: bet.settledProfit,
      odds: bet.odds,
      settled_at: bet.settledAt,
    },
  });
};

export const runSettlementForGame = async (
  gameId: string,
  requestContext: {
    requestId: string;
    traceId: string;
    runId: string;
    sessionId: string;
    userId: string;
    agentId: string;
    modelVersion: string;
  },
  emitter: EventEmitter,
  store: RuntimeStore = getRuntimeStore(),
): Promise<void> => {
  const bets = await store.listBets();
  const gameBets = bets.filter((bet) => bet.gameId === gameId && bet.status === 'pending');
  for (const bet of gameBets) {
    await settleBet(bet.id, requestContext, emitter, store);
  }

  const recs = await store.listRecommendationsByGame(gameId);
  for (const rec of recs) {
    const existing = await store.getRecommendationOutcome(rec.id);
    if (!existing) {
      await settleRecommendation(rec.id, requestContext, emitter, store);
    }
  }
};
