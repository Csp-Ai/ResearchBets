import { computeLegFragility, endgameVarianceChip, type LegFragility } from '@/src/core/live/legFragility';
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
  killRiskFragility: LegFragility;
  killRiskReasonChips: string[];
  actions: DuringCoachAction[];
  explanation: string[];
};

function estimateSecondsRemaining(leg: LiveLegState): number {
  return leg.liveClock?.timeRemainingSec ?? 720;
}

function isBusted(leg: LiveLegState): boolean {
  const minutesRemaining = Math.max(1, estimateSecondsRemaining(leg) / 60);
  return leg.status === 'needs_spike' && minutesRemaining <= 2.5 && leg.requiredRemaining >= 2;
}

function hedgeEligibleLegs(legs: LiveLegState[]): LiveLegState[] {
  return legs.filter((leg) => leg.status === 'needs_spike' || (leg.status === 'behind' && leg.volatility === 'high'));
}

export function computeDuringCoach(ticket: Pick<OpenTicket, 'coverage' | 'legs' | 'weakestLeg' | 'cashoutAvailable'>): DuringCoachResult {
  const explanation: string[] = [];
  const fragilityByLegId = new Map(ticket.legs.map((leg) => [leg.legId, computeLegFragility(leg, ticket.coverage.coverage)]));

  const nextToHit = [...ticket.legs]
    .sort((a, b) => {
      const distanceDelta = a.requiredRemaining - b.requiredRemaining;
      if (distanceDelta !== 0) return distanceDelta;
      return (fragilityByLegId.get(a.legId)?.fragilityScore ?? 0) - (fragilityByLegId.get(b.legId)?.fragilityScore ?? 0);
    })
    .slice(0, 2);

  const killRisk = [...ticket.legs].sort((a, b) => (fragilityByLegId.get(b.legId)?.fragilityScore ?? 0) - (fragilityByLegId.get(a.legId)?.fragilityScore ?? 0))[0] ?? ticket.weakestLeg;
  const killRiskFragility = fragilityByLegId.get(killRisk.legId) ?? computeLegFragility(killRisk, ticket.coverage.coverage);

  const killRiskReasonChips = [
    ...killRisk.reasonChips,
    ...(ticket.coverage.coverage !== 'full' ? ['Partial live coverage'] : []),
    ...(endgameVarianceChip(killRiskFragility) ? [endgameVarianceChip(killRiskFragility) as string] : [])
  ].slice(0, 4);

  if (ticket.legs.every((leg) => leg.requiredRemaining <= 0)) {
    explanation.push('stop_sweating:all_legs_hit');
    return { nextToHit, killRisk, killRiskFragility, killRiskReasonChips, actions: [{ kind: 'stop_sweating', label: 'Stop sweating', details: 'All legs are currently at or above target.' }], explanation };
  }

  if (ticket.legs.some((leg) => isBusted(leg))) {
    explanation.push('stop_sweating:leg_busted');
    return { nextToHit, killRisk, killRiskFragility, killRiskReasonChips, actions: [{ kind: 'stop_sweating', label: 'Stop sweating', details: 'At least one leg is very unlikely from current pace and time remaining.' }], explanation };
  }

  const actions: DuringCoachAction[] = [];
  const killClock = estimateSecondsRemaining(killRisk);

  if (ticket.coverage.coverage === 'none') {
    actions.push({ kind: 'hold', label: 'Hold', details: 'Live feed is not connected, so this view cannot confirm endgame pace right now.' });
    explanation.push('hold:not_connected');
  }

  if (killRisk.requiredRemaining <= 1 && killRiskFragility.endgameSensitivity === 'high' && killClock <= 120) {
    if (ticket.cashoutAvailable) {
      actions.push({ kind: 'hold', label: 'Hold', details: 'Late high-variance stat swings can reverse quickly; holding avoids rushed edits in the final minute.' });
      explanation.push('hold:late_high_variance_one_stat_left');
    } else {
      actions.push({ kind: 'stop_sweating', label: 'Stop sweating', details: 'With one stat left in late game variance, the remaining outcome is mostly endgame noise.' });
      explanation.push('stop_sweating:late_high_variance_one_stat_left');
    }
  }

  if (ticket.cashoutAvailable && killRiskFragility.fragilityScore >= 80 && ticket.coverage.coverage !== 'full') {
    actions.push({ kind: 'cashout', label: 'Consider cashout', details: 'Cashout is available while fragility is elevated and coverage is incomplete.' });
    explanation.push('cashout:high_fragility_partial_coverage');
  }

  const highRiskLegs = hedgeEligibleLegs(ticket.legs);
  const likelyLegs = ticket.legs.filter((leg) => leg.requiredRemaining <= 1 || leg.status === 'ahead' || leg.status === 'on_pace');
  if (highRiskLegs.length === 1 && likelyLegs.length >= 2) {
    actions.push({ kind: 'hedge', label: 'Hedge (manual)', details: 'Educational only: if you prefer lower variance, you can manually offset exposure tied to the kill-risk leg.' });
    explanation.push('hedge:single_fragile_leg_manual_only');
  }

  if (actions.length === 0) {
    actions.push({ kind: 'hold', label: 'Hold', details: 'Continue monitoring current pace before changing plan.' });
    explanation.push('hold:default');
  }

  return { nextToHit, killRisk, killRiskFragility, killRiskReasonChips, actions: actions.slice(0, 3), explanation };
}
