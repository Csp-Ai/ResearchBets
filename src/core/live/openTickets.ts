import { buildLoopProvenance, type LoopProvenance } from '@/src/core/bettor-loop/provenance';
import type { MarketType } from '@/src/core/markets/marketType';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';
import type { CoverageReason, TrackedTicket } from '@/src/core/track/types';

export type LiveClock = {
  quarter: 1 | 2 | 3 | 4;
  timeRemainingSec: number;
  elapsedGameMinutes: number;
};
export type LiveLegStatus = 'ahead' | 'on_pace' | 'behind' | 'needs_spike';
export type LiveLegVolatility = 'stable' | 'moderate' | 'high';

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
  recentMedian?: number;
  liveClock: LiveClock;
};

export type LiveLegCoverage = { coverage: 'covered' | 'missing'; reason?: CoverageReason };
export type TicketCoverage = {
  coverage: 'full' | 'partial' | 'none';
  coveredLegs: number;
  totalLegs: number;
};
export type LiveCoverageMap = Record<
  string,
  { coverage: 'full' | 'partial' | 'none'; legs: Record<string, LiveLegCoverage> }
>;

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
  coverage: LiveLegCoverage;
  liveClock?: LiveClock;
};

export type OpenTicket = {
  ticketId: string;
  title: string;
  odds: string;
  wager: string;
  mode: 'demo' | 'cache' | 'live';
  sourceHint?: string;
  rawSlipText?: string;
  createdAt?: string;
  legs: LiveLegState[];
  onPaceCount: number;
  weakestLeg: LiveLegState;
  cashoutAvailable?: boolean;
  cashoutValue?: number;
  coverage: TicketCoverage;
  trace_id?: string;
  run_id?: string;
  slip_id?: string;
  provenance?: LoopProvenance;
};

export type ExposureSummary = { byGame: string[]; highVarianceLegs: number; overlaps: string[] };
export type LiveLegUpdate = {
  currentValue: number;
  liveMargin?: number;
  elapsedGameMinutes?: number;
  quarter?: 1 | 2 | 3 | 4;
};

const TOTAL_GAME_MINUTES = 48;
const hashToUnit = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function volatilityFor(marketType: MarketType, threshold: number): LiveLegVolatility {
  if (marketType === 'assists' || marketType === 'threes') return 'high';
  if (marketType === 'rebounds' || marketType === 'ra') return 'moderate';
  if ((marketType === 'points' || marketType === 'pra') && threshold >= 33) return 'high';
  return 'stable';
}

export function evaluateLiveLeg(input: LiveLegInput): LiveLegState {
  const elapsed = clamp(input.liveClock.elapsedGameMinutes, 1, TOTAL_GAME_MINUTES);
  const paceProjection = Number(((input.currentValue / elapsed) * TOTAL_GAME_MINUTES).toFixed(1));
  const requiredRemaining = Number(Math.max(0, input.threshold - input.currentValue).toFixed(1));
  const projectionDelta = paceProjection - input.threshold;
  const status: LiveLegStatus =
    projectionDelta >= 1
      ? 'ahead'
      : projectionDelta >= -0.5
        ? 'on_pace'
        : projectionDelta >= -3
          ? 'behind'
          : 'needs_spike';
  const volatility = volatilityFor(input.marketType, input.threshold);
  const minutesRisk =
    (input.minutesSensitive ?? (input.marketType === 'assists' || input.marketType === 'threes')) &&
    input.liveClock.quarter >= 3 &&
    (input.liveMargin ?? 0) >= 18;
  const reasonChips: string[] = [];
  if (status === 'behind' || status === 'needs_spike') reasonChips.push('Behind pace');
  if (volatility === 'high') reasonChips.push('High-variance market');
  const median =
    input.recentMedian ??
    input.threshold * (0.82 + hashToUnit(`${input.player}:${input.marketType}:median`) * 0.35);
  if (Math.abs(input.threshold - median) >= 4) reasonChips.push('Ladder distance');
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
    reasonChips: reasonChips.slice(0, 2),
    coverage: { coverage: 'covered' },
    liveClock: input.liveClock
  };
}

const weakestScore = (leg: LiveLegState) =>
  ({ ahead: 0, on_pace: 1, behind: 3, needs_spike: 5 })[leg.status] +
  { stable: 0, moderate: 1, high: 2 }[leg.volatility] +
  (leg.minutesRisk ? 2 : 0);

function computeClock(createdAtIso: string, nowIso: string): LiveClock {
  const elapsedMin = Math.max(0, (Date.parse(nowIso) - Date.parse(createdAtIso)) / 60000);
  const gameElapsed = clamp(6 + (elapsedMin % 42), 1, TOTAL_GAME_MINUTES - 1);
  const quarter = clamp(Math.floor(gameElapsed / 12) + 1, 1, 4) as 1 | 2 | 3 | 4;
  return {
    quarter,
    timeRemainingSec: Math.max(0, Math.round((quarter * 12 - gameElapsed) * 60)),
    elapsedGameMinutes: gameElapsed
  };
}

function toTicketFromTracking(
  state: SlipTrackingState,
  index: number,
  nowIso: string,
  updates: Record<string, LiveLegUpdate>
): OpenTicket {
  const clock = computeClock(state.createdAtIso, nowIso);
  const odds = `+${Math.max(180, Math.round(state.legs.length * 185 + hashToUnit(state.slipId) * 250))}`;
  const wager = `$${10 + index * 5}`;
  const legs = state.legs.map((leg) => {
    const threshold = Number(leg.line) || 1;
    const update = updates[leg.legId];
    const currentValue =
      typeof update?.currentValue === 'number'
        ? update.currentValue
        : Number(
            (
              threshold *
              clamp(
                clock.elapsedGameMinutes / TOTAL_GAME_MINUTES +
                  hashToUnit(`${state.slipId}:${leg.legId}`) * 0.2,
                0,
                1.15
              )
            ).toFixed(1)
          );
    return evaluateLiveLeg({
      legId: leg.legId,
      gameId: leg.gameId,
      player: leg.player,
      marketType: 'points',
      threshold,
      currentValue,
      liveMargin: update?.liveMargin,
      liveClock: clock
    });
  });
  const weakestLeg =
    [...legs].sort((a, b) => weakestScore(b) - weakestScore(a))[0] ??
    evaluateLiveLeg({
      legId: `${state.slipId}-fallback`,
      gameId: 'N/A',
      player: 'Pending leg',
      marketType: 'points',
      threshold: 1,
      currentValue: 0,
      liveClock: clock
    });
  const onPaceCount = legs.filter(
    (leg) => leg.status === 'ahead' || leg.status === 'on_pace'
  ).length;
  return {
    ticketId: state.slipId,
    title: `Ticket #${index + 1}`,
    odds,
    wager,
    mode: state.mode,
    legs: legs.length > 0 ? legs : [weakestLeg],
    onPaceCount,
    weakestLeg,
    coverage: { coverage: 'full', coveredLegs: legs.length, totalLegs: legs.length },
    trace_id: state.trace_id,
    run_id: state.trace_id,
    slip_id: state.slipId,
    provenance: buildLoopProvenance({
      mode: state.mode,
      sourceType: 'board_staged',
      reviewState: 'unreviewed'
    })
  };
}

function toTicketFromTracked(
  ticket: TrackedTicket,
  index: number,
  mode: 'demo' | 'cache' | 'live',
  nowIso: string,
  updates: Record<string, LiveLegUpdate>,
  coverageMap?: LiveCoverageMap
): OpenTicket {
  const clock = computeClock(ticket.createdAt, nowIso);
  const odds = `+${Math.round(220 + hashToUnit(ticket.ticketId) * 360)}`;
  const wager = `$${10 + index * 5}`;
  const legs = ticket.legs.map((leg) => {
    const update = updates[leg.legId];
    const currentValue =
      typeof update?.currentValue === 'number'
        ? update.currentValue
        : Number(
            (
              leg.threshold *
              (0.22 +
                hashToUnit(
                  `${ticket.ticketId}:${leg.legId}:${Math.floor(Date.parse(nowIso) / 5000)}`
                ) *
                  0.68)
            ).toFixed(1)
          );
    const computed = evaluateLiveLeg({
      legId: leg.legId,
      gameId: leg.gameId ?? `game-${index + 1}`,
      player: leg.player,
      marketType: leg.marketType,
      threshold: leg.threshold,
      currentValue,
      liveMargin: update?.liveMargin,
      liveClock: {
        quarter: update?.quarter ?? clock.quarter,
        timeRemainingSec: clock.timeRemainingSec,
        elapsedGameMinutes: update?.elapsedGameMinutes ?? clock.elapsedGameMinutes
      }
    });
    return {
      ...computed,
      coverage: coverageMap?.[ticket.ticketId]?.legs?.[leg.legId] ?? { coverage: 'covered' }
    };
  });
  const weakestLeg =
    [...legs].sort((a, b) => weakestScore(b) - weakestScore(a))[0] ??
    evaluateLiveLeg({
      legId: `${ticket.ticketId}-fallback`,
      gameId: 'N/A',
      player: 'Pending leg',
      marketType: 'points',
      threshold: 1,
      currentValue: 0,
      liveClock: clock
    });
  const onPaceCount = legs.filter(
    (leg) => leg.status === 'ahead' || leg.status === 'on_pace'
  ).length;
  const coverage = coverageMap?.[ticket.ticketId];
  const demoCashoutValue = Number(
    (Number(wager.slice(1)) * (0.65 + onPaceCount / Math.max(1, legs.length))).toFixed(2)
  );
  const cashoutValue =
    typeof ticket.cashoutValue === 'number'
      ? ticket.cashoutValue
      : mode === 'demo'
        ? demoCashoutValue
        : undefined;
  return {
    ticketId: ticket.ticketId,
    title: `Tracked ticket #${index + 1}`,
    odds,
    wager,
    mode,
    sourceHint: ticket.sourceHint,
    rawSlipText: ticket.rawSlipText,
    createdAt: ticket.createdAt,
    legs,
    onPaceCount,
    weakestLeg,
    cashoutAvailable: typeof cashoutValue === 'number',
    cashoutValue,
    trace_id: ticket.trace_id,
    run_id: ticket.run_id,
    slip_id: ticket.slip_id,
    provenance:
      ticket.provenance ??
      buildLoopProvenance({
        mode,
        sourceType:
          ticket.sourceHint === 'paste' || ticket.sourceHint === 'screenshot'
            ? 'parser_derived'
            : 'tracked_ticket',
        reviewState: 'reviewed'
      }),
    coverage: coverage
      ? {
          coverage: coverage.coverage,
          coveredLegs: Object.values(coverage.legs).filter((l) => l.coverage === 'covered').length,
          totalLegs: Object.keys(coverage.legs).length || legs.length
        }
      : { coverage: 'full', coveredLegs: legs.length, totalLegs: legs.length }
  };
}

function demoTickets(nowIso: string): OpenTicket[] {
  const syntheticTracked: TrackedTicket[] = [
    {
      ticketId: 'demo-ticket-a',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceHint: 'demo',
      rawSlipText: 'MEM Wing A over 16.5 points',
      cashoutValue: 24.5,
      legs: [
        {
          legId: 'demo-leg-1',
          league: 'NBA',
          gameId: 'MEM@DAL',
          player: 'MEM Wing A',
          marketType: 'points',
          threshold: 16.5,
          direction: 'over',
          source: 'demo',
          parseConfidence: 'high'
        },
        {
          legId: 'demo-leg-2',
          league: 'NBA',
          gameId: 'MEM@DAL',
          player: 'MEM Guard B',
          marketType: 'assists',
          threshold: 5.5,
          direction: 'over',
          source: 'demo',
          parseConfidence: 'high'
        },
        {
          legId: 'demo-leg-3',
          league: 'NBA',
          gameId: 'DEN@PHX',
          player: 'PHX Scorer I',
          marketType: 'threes',
          threshold: 2.5,
          direction: 'over',
          source: 'demo',
          parseConfidence: 'high'
        }
      ]
    }
  ];
  return syntheticTracked.map((ticket, index) =>
    toTicketFromTracked(ticket, index, 'demo', nowIso, {})
  );
}

export function computeExposureSummary(tickets: OpenTicket[]): ExposureSummary {
  const allLegs = tickets.flatMap((ticket) => ticket.legs);
  const totalLegs = allLegs.length || 1;
  const byGame = [
    ...new Map(
      allLegs.map((leg) => [
        leg.gameId,
        allLegs.filter((item) => item.gameId === leg.gameId).length
      ])
    ).entries()
  ]
    .slice(0, 3)
    .map(([gameId, count]) => `${gameId}: ${Math.round((count / totalLegs) * 100)}% of legs`);
  const overlaps = [
    ...new Map(
      allLegs.map((leg) => [
        leg.player,
        allLegs.filter((item) => item.player === leg.player).length
      ])
    ).entries()
  ]
    .filter(([, count]) => count > 1)
    .slice(0, 2)
    .map(([player, count]) => `${player} in ${count} tickets`);
  return {
    byGame,
    highVarianceLegs: allLegs.filter((leg) => leg.volatility === 'high').length,
    overlaps
  };
}

export function buildOpenTickets(
  mode: 'demo' | 'cache' | 'live',
  trackedTickets: TrackedTicket[],
  states: SlipTrackingState[],
  nowIso: string,
  updates: Record<string, LiveLegUpdate> = {},
  coverageMap?: LiveCoverageMap
): OpenTicket[] {
  if (trackedTickets.length > 0)
    return trackedTickets
      .slice(0, 5)
      .map((ticket, index) =>
        toTicketFromTracked(ticket, index, mode, nowIso, updates, coverageMap)
      );
  const openStates = states.filter((state) => state.status === 'alive').slice(0, 5);
  if (openStates.length > 0)
    return openStates.map((state, index) => toTicketFromTracking(state, index, nowIso, updates));
  if (mode === 'demo' || mode === 'cache') return demoTickets(nowIso);
  return [];
}
