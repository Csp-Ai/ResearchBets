import 'server-only';

import { randomUUID } from 'node:crypto';

import { getBoardData, type BoardSport } from '@/src/core/board/boardService.server';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import { getSupabaseServiceClient } from '@/src/services/supabase';

import { DEMO_GAMES, type BettorGame } from './demoData';

export type BettorDataEnvelope = {
  mode: 'live' | 'demo';
  games: BettorGame[];
  providerStatus: {
    stats: 'connected' | 'missing';
    odds: 'connected' | 'missing';
    injuries: 'connected' | 'missing';
  };
  provenance: {
    source: 'provider' | 'fallback';
    reason?: string;
  };
  modeFallbackApplied?: boolean;
  providerErrors?: string[];
  userSafeReason?: string;
};

const readProviderStatus = () => {
  const sportsDataKey = resolveWithAliases(
    CANONICAL_KEYS.SPORTSDATA_API_KEY,
    ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY],
  );
  const oddsKey = resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]);
  return {
    stats: sportsDataKey ? 'connected' : 'missing',
    odds: oddsKey ? 'connected' : 'missing',
    injuries: sportsDataKey ? 'connected' : 'missing',
  } as const;
};

const emitGatewayEvent = async (eventName: string, properties: Record<string, unknown>) => {
  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from('events_analytics').insert({
      event_name: eventName,
      request_id: randomUUID(),
      trace_id: randomUUID(),
      run_id: randomUUID(),
      session_id: 'system:bettor_gateway',
      user_id: 'system',
      agent_id: 'bettor_gateway',
      model_version: 'gateway-v3',
      properties,
      created_at: new Date().toISOString()
    });
  } catch {
    // best-effort analytics only
  }
};

const toBettorGame = (game: ReturnType<typeof DEMO_GAMES.at>): BettorGame => game ?? DEMO_GAMES[0]!;

const mapBoardToBettorGame = (board: Awaited<ReturnType<typeof getBoardData>>): BettorGame[] => {
  const demo = DEMO_GAMES[0]!;
  return board.games.map((game) => {
    const scoutSet = board.scouts.filter((scout) => scout.gameId === game.gameId).slice(0, 4);
    return {
      id: game.gameId,
      league: 'NBA' as const,
      status: game.status,
      startTime: game.startTimeLocal,
      matchup: `${game.away} @ ${game.home}`,
      homeTeam: game.home,
      awayTeam: game.away,
      homeRecord: demo.homeRecord,
      awayRecord: demo.awayRecord,
      homeWinProbability: 0.55,
      awayWinProbability: 0.45,
      matchupReasons: ['Recent pace and shot profile support this edge.', 'Core player availability currently stable.', 'Market line still near prior median.'],
      activePlayers: [
        { name: game.home, team: game.home, role: 'Core', status: 'active' as const },
        { name: game.away, team: game.away, role: 'Core', status: 'active' as const }
      ],
      propSuggestions: scoutSet.map((scout, propIdx) => ({
        id: `${game.gameId}:${propIdx}`,
        player: scout.headline.split(' points over ')[0] ?? game.home,
        team: propIdx % 2 === 0 ? game.home : game.away,
        role: 'Core',
        market: 'Points Over',
        line: Number.parseFloat((scout.headline.split(' points over ')[1] ?? '18.5')),
        odds: scout.subline,
        hitRateL5: Math.max(0.1, Math.min(0.95, scout.hitRate)),
        hitRateL10: Math.max(0.1, Math.min(0.95, scout.hitRate - 0.05)),
        reasons: scout.reasons,
        uncertainty: scout.uncertainty,
        contributingAgents: scout.sources
      }))
    };
  }).filter(Boolean);
};

export const getBettorData = async (options?: { liveModeOverride?: boolean; sport?: BoardSport; tz?: string; date?: string; demoRequested?: boolean }): Promise<BettorDataEnvelope> => {
  const providerStatus = readProviderStatus();
  const board = await getBoardData({
    sport: options?.sport ?? 'NBA',
    tz: options?.tz ?? 'America/Phoenix',
    date: options?.date,
    demoRequested: options?.demoRequested || options?.liveModeOverride === false
  });

  if (board.mode !== 'live') {
    await emitGatewayEvent('bettor_gateway_fallback', {
      reason: board.reason,
      providerErrors: board.providerErrors,
      sport: board.sport,
      tz: board.tz
    });
  }

  const games = mapBoardToBettorGame(board);

  return {
    mode: board.mode === 'live' ? 'live' : 'demo',
    games: games.length > 0 ? games : DEMO_GAMES.map((g) => toBettorGame(g)),
    providerStatus,
    provenance: { source: board.mode === 'live' ? 'provider' : 'fallback', reason: board.reason },
    modeFallbackApplied: board.modeFallbackApplied,
    providerErrors: board.providerErrors,
    userSafeReason: board.userSafeReason
  };
};
