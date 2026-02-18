import { z } from 'zod';

export const DecisionCardV0Schema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const MarketGameSchema = z.object({
  gameId: z.string().min(1),
  sport: z.string().min(1),
  label: z.string().min(1),
  startsAt: z.string().min(1),
  source: z.enum(['DEMO', 'derived', 'scraped']),
  degraded: z.boolean(),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  lines: z.object({
    homeMoneyline: z.number().optional(),
    awayMoneyline: z.number().optional(),
    spread: z.number().optional(),
    total: z.number().optional()
  }),
  implied: z.object({
    home: z.number(),
    away: z.number(),
    source: z.enum(['moneyline', 'fallback'])
  })
});

export const MarketSnapshotSchema = z.object({
  sport: z.string().min(1),
  loadedAt: z.string().min(1),
  source: z.enum(['DEMO', 'derived', 'scraped']),
  degraded: z.boolean(),
  games: z.array(MarketGameSchema)
});

export const InsightNodeSchema = z.object({
  insight_id: z.string().min(1),
  trace_id: z.string().min(1),
  run_id: z.string().min(1),
  game_id: z.string().min(1),
  agent_key: z.string().min(1),
  track: z.enum(['baseline', 'hybrid']),
  insight_type: z.enum([
    'injury',
    'line_move',
    'matchup_stat',
    'narrative',
    'weather',
    'market_delta',
    'correlated_risk',
    'market_snapshot',
    'model_snapshot',
    'delta_snapshot',
    'outcome_snapshot',
    'edge_realized',
    'calibration_update'
  ]),
  claim: z.string().min(1),
  evidence: z.array(
    z.object({
      source: z.string().min(1),
      url: z.string().optional(),
      snippet: z.string().optional()
    })
  ),
  confidence: z.number().min(0).max(1),
  timestamp: z.string().min(1),
  decay_half_life: z.number(),
  decay_half_life_minutes: z.number(),
  attribution: z
    .object({
      source_book: z.string().optional(),
      model_version: z.string().optional()
    })
    .optional(),
  market_implied: z.number().optional(),
  model_implied: z.number().optional(),
  delta: z.number().optional()
});

export const BetSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  selection: z.string().min(1),
  odds: z.number(),
  stake: z.number(),
  status: z.enum(['pending', 'settled']),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().min(1)
});

export const TrackedBetSchema = z.object({
  gameId: z.string().min(1),
  propId: z.string().min(1),
  player: z.string().min(1),
  market: z.string().min(1),
  line: z.number(),
  modelProbability: z.number().min(0).max(1),
  delta: z.number()
});
