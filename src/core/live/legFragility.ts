import type { LiveLegState, LiveLegVolatility, TicketCoverage } from '@/src/core/live/openTickets';

export type LegStatType = 'points' | 'rebounds' | 'assists' | 'threes' | 'pra' | 'unknown';
export type EndgameSensitivity = 'low' | 'medium' | 'high';
export type RoleHint = 'primary_handler' | 'secondary' | 'big' | 'shooter' | 'unknown';

export type LegFragility = {
  statType: LegStatType;
  endgameSensitivity: EndgameSensitivity;
  roleHint: RoleHint;
  minutesCompressionRisk: boolean;
  fragilityScore: number;
};

const endgameWeight: Record<EndgameSensitivity, number> = {
  low: 8,
  medium: 16,
  high: 28
};

const volatilityWeight: Record<LiveLegVolatility, number> = {
  stable: 8,
  moderate: 16,
  high: 24
};

function inferStatType(leg: LiveLegState): LegStatType {
  const market = `${leg.marketType}`.toLowerCase();
  if (market.includes('assist')) return 'assists';
  if (market.includes('rebound')) return 'rebounds';
  if (market.includes('three')) return 'threes';
  if (market === 'pra') return 'pra';
  if (market.includes('point')) return 'points';
  return 'unknown';
}

function inferSensitivity(statType: LegStatType): EndgameSensitivity {
  if (statType === 'assists' || statType === 'threes') return 'high';
  if (statType === 'rebounds' || statType === 'pra') return 'medium';
  if (statType === 'points') return 'low';
  return 'medium';
}

function inferRoleHint(leg: LiveLegState, statType: LegStatType): RoleHint {
  const playerText = leg.player.toLowerCase();
  if (/(\bpg\b|\bpoint guard\b|guard)/.test(playerText)) return 'primary_handler';
  if (/(\bsg\b|wing)/.test(playerText)) return 'secondary';
  if (/(\bc\b|center|\bpf\b|forward)/.test(playerText)) return 'big';

  if (statType === 'assists' || statType === 'pra') return 'primary_handler';
  if (statType === 'rebounds') return 'big';
  if (statType === 'threes') return 'shooter';
  if (statType === 'points') return 'secondary';
  return 'unknown';
}

function isLateClock(leg: LiveLegState): boolean {
  if (!leg.liveClock) return false;
  if (leg.liveClock.quarter === 4) return leg.liveClock.timeRemainingSec <= 180;
  if (leg.liveClock.quarter === 2 || leg.liveClock.quarter === 3) return leg.liveClock.timeRemainingSec <= 120;
  return false;
}

export function computeLegFragility(leg: LiveLegState, ticketCoverage: TicketCoverage['coverage']): LegFragility {
  const statType = inferStatType(leg);
  const endgameSensitivity = inferSensitivity(statType);
  const roleHint = inferRoleHint(leg, statType);
  const minutesCompressionRisk = leg.minutesRisk || isLateClock(leg);

  const remainingDistanceComponent = Math.min(30, Math.max(0, leg.requiredRemaining) * 8);
  const coveragePenalty = ticketCoverage === 'partial' || leg.coverage.coverage === 'missing' ? 12 : ticketCoverage === 'none' ? 16 : 0;
  const minutesPenalty = minutesCompressionRisk ? 14 : 0;

  const rawScore = remainingDistanceComponent + volatilityWeight[leg.volatility] + endgameWeight[endgameSensitivity] + minutesPenalty + coveragePenalty;
  const fragilityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  return { statType, endgameSensitivity, roleHint, minutesCompressionRisk, fragilityScore };
}

export function endgameVarianceChip(fragility: LegFragility): string | null {
  if (fragility.minutesCompressionRisk) return 'Minutes compression';
  if (fragility.statType === 'assists') return 'Endgame assist variance';
  if (fragility.statType === 'rebounds') return 'Endgame rebound variance';
  if (fragility.statType === 'threes') return 'High-variance shooting';
  return null;
}
