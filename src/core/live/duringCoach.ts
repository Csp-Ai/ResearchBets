import type { LiveLegState, OpenTicket } from '@/src/core/live/openTickets';

export type DuringCoachActionKind = 'hold' | 'cashout' | 'hedge' | 'stop_sweating';

export type DuringCoachAction = {
  kind: DuringCoachActionKind;
  label: string;
  details?: string;
};

export type DuringCoachResult = {
  nextToHit: LiveLegState[];
  killRisk: LiveLegState;
  actions: DuringCoachAction[];
  explanation: string[];
};

const volatilityRank: Record<LiveLegState['volatility'], number> = { stable: 0, moderate: 1, high: 2 };
const statusRiskRank: Record<LiveLegState['status'], number> = { ahead: 0, on_pace: 1, behind: 3, needs_spike: 5 };

function estimateMinutesRemaining(leg: LiveLegState): number {
  if (leg.liveClock?.timeRemainingSec != null) return Math.max(1, leg.liveClock.timeRemainingSec / 60);
  if (leg.liveClock?.quarter != null) {
    const phaseMinutes = { 1: 30, 2: 22, 3: 12, 4: 5 }[leg.liveClock.quarter];
    return Math.max(1, phaseMinutes);
  }
  return 12;
}

function computeKillScore(leg: LiveLegState): number {
  return statusRiskRank[leg.status] + volatilityRank[leg.volatility] + (leg.minutesRisk ? 2 : 0) + (leg.requiredRemaining >= 4 ? 1 : 0);
}

function isLikelyLeg(leg: LiveLegState): boolean {
  return leg.requiredRemaining <= 1 || leg.status === 'ahead' || leg.status === 'on_pace';
}

function isBusted(leg: LiveLegState): boolean {
  const minutesRemaining = estimateMinutesRemaining(leg);
  return leg.status === 'needs_spike' && minutesRemaining <= 2.5 && leg.requiredRemaining >= 2;
}

export function computeDuringCoach(ticket: Pick<OpenTicket, 'coverage' | 'legs' | 'weakestLeg' | 'cashoutAvailable'>): DuringCoachResult {
  const explanation: string[] = [];
  const legs = ticket.legs;
  const nextToHit = [...legs]
    .sort((a, b) => (a.requiredRemaining - b.requiredRemaining) || (volatilityRank[a.volatility] - volatilityRank[b.volatility]))
    .slice(0, 2);

  const killRisk = [...legs].sort((a, b) => computeKillScore(b) - computeKillScore(a))[0] ?? ticket.weakestLeg;

  if (legs.every((leg) => leg.requiredRemaining <= 0)) {
    explanation.push('stop_sweating:all_legs_hit');
    return { nextToHit, killRisk, actions: [{ kind: 'stop_sweating', label: 'Stop sweating', details: 'All legs are currently at or above target.' }], explanation };
  }

  if (legs.some((leg) => isBusted(leg))) {
    explanation.push('stop_sweating:leg_busted');
    return { nextToHit, killRisk, actions: [{ kind: 'stop_sweating', label: 'Stop sweating', details: 'At least one leg is very unlikely from current pace and time remaining.' }], explanation };
  }

  const minutesRemaining = estimateMinutesRemaining(killRisk);
  const urgency = killRisk.requiredRemaining / Math.max(1, minutesRemaining);
  const ladderDistanceHigh = killRisk.requiredRemaining >= 5 || urgency >= 1.2;
  const cashoutTrigger = Boolean(ticket.cashoutAvailable && (killRisk.status === 'needs_spike' || killRisk.minutesRisk || ladderDistanceHigh));

  const highRiskLegs = legs.filter((leg) => leg.status === 'needs_spike' || (leg.status === 'behind' && leg.volatility === 'high'));
  const likelyLegs = legs.filter((leg) => isLikelyLeg(leg));
  const hedgeTrigger = highRiskLegs.length === 1 && likelyLegs.length >= 2;

  const actions: DuringCoachAction[] = [];

  const onPaceShare = legs.length > 0
    ? legs.filter((leg) => leg.status === 'ahead' || leg.status === 'on_pace').length / legs.length
    : 0;
  const holdTrigger = onPaceShare >= 0.6 && !cashoutTrigger && !hedgeTrigger && ticket.coverage.coverage !== 'none';

  if (holdTrigger) {
    actions.push({ kind: 'hold', label: 'Hold', details: 'Most live signals are still within a normal range.' });
    explanation.push('hold:at_least_sixty_percent_on_pace');
  }

  if (cashoutTrigger) {
    actions.push({ kind: 'cashout', label: 'Consider cashout', details: 'Cashout available. Consider if your goal is to lock value.' });
    explanation.push('cashout:minutes_or_distance_risk');
  }

  if (hedgeTrigger) {
    actions.push({ kind: 'hedge', label: 'Consider hedge (light)', details: 'If you want to reduce variance: consider a small opposing position on the most fragile leg’s correlated market.' });
    explanation.push('hedge:single_high_risk_leg');
  }

  if (actions.length === 0) {
    actions.push({ kind: 'hold', label: 'Hold', details: 'Continue monitoring current pace before changing plan.' });
    explanation.push('hold:default');
  }

  return { nextToHit, killRisk, actions: actions.slice(0, 3), explanation };
}
