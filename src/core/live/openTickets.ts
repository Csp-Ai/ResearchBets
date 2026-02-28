import type { MarketType } from '@/src/core/markets/marketType';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

export type LiveClock = {
  quarter: 1 | 2 | 3 | 4;
  timeRemainingSec: number;
  elapsedGameMinutes: number;
};

export type LiveLegInput = {
  legId: string;
  gameId: string;
  player: string;
  marketType: MarketType;
  threshold: number;
  currentValue: number;
  pregameSpread?: number;
  liveMargin?: number;
  minutesSensitive?: boolean;
  liveClock: LiveClock;
};

export type LiveLegStatus = 'ahead' | 'on_pace' | 'behind' | 'needs_spike';
export type LiveLegVolatility = 'stable' | 'moderate' | 'high';

export type LiveLegState = {
  legId: string;
  gameId: string;
  player: string;
  marketType: MarketType;
  currentValue: number;
  threshold: number;
  requiredRemaining: number;
  paceProjection: number;
  status: LiveLegStatus;
  volatility: LiveLegVolatility;
  minutesRisk: boolean;
  reasonChips: string[];
};

export type OpenTicket = {
  ticketId: string;
  title: string;
  odds: string;
  wager: string;
  mode: 'demo' | 'cache' | 'live';
  legs: LiveLegState[];
  onPaceCount: number;
  weakestLeg: LiveLegState;
  cashoutValue?: string;
};

export type ExposureSummary = {
  byGame: string[];
  highVarianceLegs: number;
  overlaps: string[];
};

const TOTAL_GAME_MINUTES = 48;

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function volatilityFor(marketType: MarketType, threshold: number): LiveLegVolatility {
  if (marketType === 'assists' || marketType === 'threes') return 'high';
  if (marketType === 'rebounds' || marketType === 'ra') return 'moderate';
  if ((marketType === 'points' || marketType === 'pra') && threshold >= 33) return 'high';
  return 'stable';
}

function isMinutesSensitive(marketType: MarketType, threshold: number) {
  return marketType === 'assists' || marketType === 'threes' || (marketType === 'points' && threshold >= 20);
}

export function evaluateLiveLeg(input: LiveLegInput): LiveLegState {
  const elapsed = clamp(input.liveClock.elapsedGameMinutes, 1, TOTAL_GAME_MINUTES);
  const paceProjection = Number(((input.currentValue / elapsed) * TOTAL_GAME_MINUTES).toFixed(1));
  const requiredRemaining = Number(Math.max(0, input.threshold - input.currentValue).toFixed(1));
  const projectionDelta = paceProjection - input.threshold;
  const status: LiveLegStatus = projectionDelta >= 1
    ? 'ahead'
    : projectionDelta >= -0.5
      ? 'on_pace'
      : projectionDelta >= -3
        ? 'behind'
        : 'needs_spike';

  const volatility = volatilityFor(input.marketType, input.threshold);
  const postHalftime = input.liveClock.quarter >= 3;
  const spreadRisk = (input.pregameSpread ?? 0) >= 7;
  const marginRisk = postHalftime && (input.liveMargin ?? 0) >= 18;
  const minutesRisk = (input.minutesSensitive ?? isMinutesSensitive(input.marketType, input.threshold)) && (spreadRisk || marginRisk);

  const reasonChips: string[] = [];
  if (minutesRisk) reasonChips.push('Minutes risk (margin)');
  if (status === 'needs_spike') reasonChips.push('Behind pace');
  if (status === 'behind') reasonChips.push('Slightly behind pace');
  if (volatility === 'high') reasonChips.push('High-variance stat');

  return {
    legId: input.legId,
    gameId: input.gameId,
    player: input.player,
    marketType: input.marketType,
    currentValue: Number(input.currentValue.toFixed(1)),
    threshold: input.threshold,
    requiredRemaining,
    paceProjection,
    status,
    volatility,
    minutesRisk,
    reasonChips: reasonChips.slice(0, 2)
  };
}

function weakestScore(leg: LiveLegState) {
  const statusScore: Record<LiveLegStatus, number> = { ahead: 0, on_pace: 1, behind: 3, needs_spike: 5 };
  const volatilityScore: Record<LiveLegVolatility, number> = { stable: 0, moderate: 1, high: 2 };
  return statusScore[leg.status] + volatilityScore[leg.volatility] + (leg.minutesRisk ? 2 : 0);
}

function marketFromString(value: string): MarketType {
  const normalized = value.toLowerCase();
  if (normalized.includes('assist')) return 'assists';
  if (normalized.includes('rebound')) return 'rebounds';
  if (normalized.includes('three')) return 'threes';
  if (normalized.includes('pra')) return 'pra';
  if (normalized.includes('ra')) return 'ra';
  return 'points';
}

function computeClock(createdAtIso: string, nowIso: string): LiveClock {
  const elapsedMin = Math.max(0, (Date.parse(nowIso) - Date.parse(createdAtIso)) / 60000);
  const gameElapsed = clamp(6 + (elapsedMin % 42), 1, TOTAL_GAME_MINUTES - 1);
  const quarter = clamp(Math.floor(gameElapsed / 12) + 1, 1, 4) as 1 | 2 | 3 | 4;
  const timeRemainingSec = Math.max(0, Math.round((quarter * 12 - gameElapsed) * 60));
  return { quarter, timeRemainingSec, elapsedGameMinutes: gameElapsed };
}

function toTicketFromTracking(state: SlipTrackingState, index: number, nowIso: string): OpenTicket {
  const clock = computeClock(state.createdAtIso, nowIso);
  const oddsSeed = Math.round((state.legs.length * 185) + (hashToUnit(state.slipId) * 250));
  const odds = `+${Math.max(180, oddsSeed)}`;
  const wager = `$${10 + (index * 5)}`;

  const legs = state.legs.map((leg) => {
    const threshold = Number(leg.line) || 1;
    const progressSeed = hashToUnit(`${state.slipId}:${leg.legId}`);
    const currentValue = typeof leg.currentValue === 'number'
      ? leg.currentValue
      : Number((threshold * clamp((clock.elapsedGameMinutes / TOTAL_GAME_MINUTES) + (progressSeed * 0.2), 0, 1.15)).toFixed(1));
    const pregameSpread = Math.round(4 + hashToUnit(`${leg.gameId}:spread`) * 8);
    const liveMargin = Math.round(8 + hashToUnit(`${leg.gameId}:margin`) * 18);
    return evaluateLiveLeg({
      legId: leg.legId,
      gameId: leg.gameId,
      player: leg.player,
      marketType: marketFromString(leg.market),
      threshold,
      currentValue,
      pregameSpread,
      liveMargin,
      minutesSensitive: undefined,
      liveClock: clock
    });
  });

  const weakestLeg = [...legs].sort((a, b) => weakestScore(b) - weakestScore(a))[0];
  if (!weakestLeg) {
    const fallbackLeg = evaluateLiveLeg({
      legId: `${state.slipId}-fallback`,
      gameId: 'N/A',
      player: 'Pending leg',
      marketType: 'points',
      threshold: 1,
      currentValue: 0,
      liveClock: clock
    });
    return {
      ticketId: state.slipId,
      title: `Ticket #${index + 1}`,
      odds,
      wager,
      mode: state.mode,
      legs: [fallbackLeg],
      onPaceCount: 0,
      weakestLeg: fallbackLeg,
      cashoutValue: undefined
    };
  }
  const onPaceCount = legs.filter((leg) => leg.status === 'ahead' || leg.status === 'on_pace').length;
  const cashoutValue = state.status === 'alive' ? `$${(Number(wager.slice(1)) * (0.8 + (onPaceCount / Math.max(1, legs.length)))).toFixed(2)}` : undefined;

  return {
    ticketId: state.slipId,
    title: `Ticket #${index + 1}`,
    odds,
    wager,
    mode: state.mode,
    legs,
    onPaceCount,
    weakestLeg,
    cashoutValue
  };
}

function demoTickets(nowIso: string): OpenTicket[] {
  const base: Array<{ id: string; odds: string; wager: string; legs: Array<{ gameId: string; player: string; marketType: MarketType; threshold: number; pregameSpread?: number }> }> = [
    {
      id: 'demo-ticket-a',
      odds: '+540',
      wager: '$20',
      legs: [
        { gameId: 'MEM@DAL', player: 'MEM Wing A', marketType: 'points', threshold: 16.5, pregameSpread: 8 },
        { gameId: 'MEM@DAL', player: 'MEM Guard B', marketType: 'assists', threshold: 5.5, pregameSpread: 8 },
        { gameId: 'MEM@DAL', player: 'MEM Forward C', marketType: 'rebounds', threshold: 7.5, pregameSpread: 8 }
      ]
    },
    {
      id: 'demo-ticket-b',
      odds: '+420',
      wager: '$25',
      legs: [
        { gameId: 'DEN@PHX', player: 'DEN Anchor 1', marketType: 'points', threshold: 24.5 },
        { gameId: 'DEN@PHX', player: 'DEN Anchor 2', marketType: 'assists', threshold: 7.5 },
        { gameId: 'BOS@NYK', player: 'NYK Wing D', marketType: 'threes', threshold: 2.5 }
      ]
    },
    {
      id: 'demo-ticket-c',
      odds: '+1820',
      wager: '$10',
      legs: [
        { gameId: 'LAL@SAC', player: 'LAL Role E', marketType: 'threes', threshold: 3.5 },
        { gameId: 'LAL@SAC', player: 'SAC Guard F', marketType: 'assists', threshold: 8.5 },
        { gameId: 'MEM@DAL', player: 'DAL Center G', marketType: 'rebounds', threshold: 11.5 },
        { gameId: 'MEM@DAL', player: 'MEM Wing H', marketType: 'points', threshold: 20.5, pregameSpread: 8 },
        { gameId: 'DEN@PHX', player: 'PHX Scorer I', marketType: 'points', threshold: 31.5 },
        { gameId: 'BOS@NYK', player: 'BOS Shooter J', marketType: 'threes', threshold: 4.5 }
      ]
    }
  ];
  const clock = computeClock('2026-01-01T00:00:00.000Z', nowIso);

  return base.map((ticket, ticketIndex) => {
    const legs = ticket.legs.map((leg, legIndex) => {
      const progress = 0.2 + hashToUnit(`${ticket.id}:${leg.player}:${Math.floor(Date.parse(nowIso) / 5000)}`) * 0.7;
      const liveMargin = Math.round(10 + hashToUnit(`${ticket.id}:${leg.gameId}:margin`) * 20);
      return evaluateLiveLeg({
        legId: `${ticket.id}-leg-${legIndex + 1}`,
        gameId: leg.gameId,
        player: leg.player,
        marketType: leg.marketType,
        threshold: leg.threshold,
        currentValue: Number((leg.threshold * progress).toFixed(1)),
        pregameSpread: leg.pregameSpread,
        liveMargin,
        liveClock: clock
      });
    });
    const weakestLeg = [...legs].sort((a, b) => weakestScore(b) - weakestScore(a))[0];
    if (!weakestLeg) {
      const fallbackLeg = evaluateLiveLeg({
        legId: `${ticket.id}-fallback`,
        gameId: 'N/A',
        player: 'Pending leg',
        marketType: 'points',
        threshold: 1,
        currentValue: 0,
        liveClock: clock
      });
      return {
        ticketId: ticket.id,
        title: `Ticket #${ticketIndex + 1}`,
        odds: ticket.odds,
        wager: ticket.wager,
        mode: 'demo' as const,
        legs: [fallbackLeg],
        onPaceCount: 0,
        weakestLeg: fallbackLeg,
        cashoutValue: `$${Number(ticket.wager.slice(1)).toFixed(2)}`
      };
    }
    const onPaceCount = legs.filter((leg) => leg.status === 'ahead' || leg.status === 'on_pace').length;
    return {
      ticketId: ticket.id,
      title: `Ticket #${ticketIndex + 1}`,
      odds: ticket.odds,
      wager: ticket.wager,
      mode: 'demo' as const,
      legs,
      onPaceCount,
      weakestLeg,
      cashoutValue: `$${(Number(ticket.wager.slice(1)) * (0.7 + (onPaceCount / Math.max(1, legs.length)))).toFixed(2)}`
    };
  });
}

export function computeExposureSummary(tickets: OpenTicket[]): ExposureSummary {
  const allLegs = tickets.flatMap((ticket) => ticket.legs);
  const totalLegs = allLegs.length || 1;
  const byGameCounts = new Map<string, number>();
  const playerCounts = new Map<string, number>();

  for (const leg of allLegs) {
    byGameCounts.set(leg.gameId, (byGameCounts.get(leg.gameId) ?? 0) + 1);
    playerCounts.set(leg.player, (playerCounts.get(leg.player) ?? 0) + 1);
  }

  const byGame = [...byGameCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([gameId, count]) => `${gameId}: ${Math.round((count / totalLegs) * 100)}% of legs`);

  const overlaps = [...playerCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([player, count]) => `${player} in ${count} tickets`);

  return {
    byGame,
    highVarianceLegs: allLegs.filter((leg) => leg.volatility === 'high').length,
    overlaps
  };
}

export function buildOpenTickets(mode: 'demo' | 'cache' | 'live', states: SlipTrackingState[], nowIso: string): OpenTicket[] {
  const openStates = states.filter((state) => state.status === 'alive').slice(0, 5);
  if (openStates.length > 0) {
    return openStates.map((state, index) => toTicketFromTracking(state, index, nowIso));
  }
  if (mode === 'demo' || mode === 'cache') {
    return demoTickets(nowIso);
  }
  return [];
}
