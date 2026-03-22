import type { OpenTicket, LiveLegState } from '@/src/core/live/openTickets';
import type { PostmortemRecord } from '@/src/core/review/types';

export type BettorLegStatus =
  | 'cleared'
  | 'ahead'
  | 'on pace'
  | 'slightly behind'
  | 'behind'
  | 'critical'
  | 'in progress'
  | 'needs movement'
  | 'one event away';
export type TicketLoopStage = 'setup' | 'analysis' | 'live' | 'after';

export type LiveCommandLeg = {
  legId: string;
  player: string;
  marketLabel: string;
  status: BettorLegStatus;
  progressLabel: string;
  riskNote: string;
  isStrongest: boolean;
  isWeakest: boolean;
};

export type LiveCommandSurface = {
  stage: TicketLoopStage;
  headline: string;
  badge: string;
  attention: string;
  ticketPressure: 'Low' | 'Medium' | 'High';
  gameScript: string;
  strongestLeg: LiveCommandLeg | null;
  weakestLeg: LiveCommandLeg | null;
  primaryFailurePoint: string;
  recommendation: string;
  legs: LiveCommandLeg[];
};

const rank: Record<BettorLegStatus, number> = {
  cleared: 0,
  ahead: 1,
  'one event away': 2,
  'on pace': 3,
  'slightly behind': 4,
  'in progress': 5,
  'needs movement': 6,
  behind: 7,
  critical: 8
};

const toMarketLabel = (leg: Pick<LiveLegState, 'marketType' | 'threshold'>) =>
  `${leg.marketType} ${leg.threshold}`;

export function classifyBettorLegStatus(leg: LiveLegState): BettorLegStatus {
  if (leg.currentValue >= leg.threshold) return 'cleared';
  if (leg.requiredRemaining <= 1) return 'one event away';
  if (leg.status === 'ahead') return 'ahead';
  if (leg.status === 'on_pace') return 'on pace';
  if (leg.status === 'behind') return leg.requiredRemaining <= 2 ? 'slightly behind' : 'behind';
  if (leg.status === 'needs_spike')
    return leg.requiredRemaining <= 2 ? 'needs movement' : 'critical';
  if (leg.currentValue > 0) return 'in progress';
  return 'needs movement';
}

function riskNoteFor(leg: LiveLegState, status: BettorLegStatus) {
  if (status === 'cleared') return 'Already home.';
  if (leg.minutesRisk) return 'Minutes could tighten if the margin keeps growing.';
  if (status === 'one event away') return 'One clean sequence clears this leg.';
  if (status === 'ahead') return 'Current pace is carrying the ticket.';
  if (status === 'on pace') return 'Holding a playable pace right now.';
  if (status === 'slightly behind') return 'Needs a small push to get back on track.';
  if (status === 'behind') return 'Behind pace relative to current game flow.';
  if (status === 'critical') return 'Ticket likely needs a late swing here.';
  if (status === 'needs movement') return 'Needs the next few rotations to flip.';
  return 'Still building toward the line.';
}

function progressLabelFor(leg: LiveLegState, status: BettorLegStatus) {
  if (status === 'cleared')
    return `${leg.currentValue.toFixed(1)} / ${leg.threshold} · already cleared`;
  if (status === 'one event away')
    return `${leg.currentValue.toFixed(1)} / ${leg.threshold} · one event away`;
  return `${leg.currentValue.toFixed(1)} / ${leg.threshold} · ${status}`;
}

function derivePressure(legs: LiveCommandLeg[]): 'Low' | 'Medium' | 'High' {
  const total = legs.reduce((sum, leg) => sum + rank[leg.status], 0);
  const avg = total / Math.max(1, legs.length);
  if (avg >= 5.5) return 'High';
  if (avg >= 3) return 'Medium';
  return 'Low';
}

function deriveGameScript(ticket: OpenTicket, pressure: 'Low' | 'Medium' | 'High') {
  const highVariance = ticket.legs.filter((leg) => leg.volatility === 'high').length;
  const lateWindow = ticket.legs.some((leg) => (leg.liveClock?.quarter ?? 1) >= 3);
  if (ticket.legs.some((leg) => leg.minutesRisk))
    return 'Margin risk is rising, so minutes-sensitive legs are under pressure.';
  if (highVariance >= 2 && pressure !== 'Low')
    return 'Higher-variance scorer legs are driving the swing right now.';
  if (lateWindow && pressure === 'Low')
    return 'Game script is stable enough that the ticket can keep grinding.';
  return 'Current game flow is mixed, so the weakest leg matters more than broad script reads.';
}

export function deriveLiveCommandSurface(
  ticket: OpenTicket | null,
  postmortem?: PostmortemRecord | null
): LiveCommandSurface | null {
  if (!ticket) {
    if (postmortem) {
      return {
        stage: 'after',
        headline: 'Outcome review ready',
        badge:
          postmortem.status === 'won' ? 'Won' : postmortem.status === 'lost' ? 'Lost' : 'Review',
        attention:
          postmortem.narrative[1] ??
          postmortem.narrative[0] ??
          'Review the result and note the main swing leg.',
        ticketPressure: 'Low',
        gameScript: postmortem.narrative[2] ?? 'Outcome is settled.',
        strongestLeg: null,
        weakestLeg: null,
        primaryFailurePoint: postmortem.narrative[1] ?? 'Outcome settled.',
        recommendation: 'Open postmortem to see why the ticket won or failed.',
        legs: []
      };
    }
    return null;
  }

  const commandLegs = ticket.legs.map((raw) => {
    const status = classifyBettorLegStatus(raw);
    return {
      legId: raw.legId,
      player: raw.player,
      marketLabel: toMarketLabel(raw),
      status,
      progressLabel: progressLabelFor(raw, status),
      riskNote: riskNoteFor(raw, status),
      isStrongest: false,
      isWeakest: false
    };
  });

  const strongestLeg = [...commandLegs].sort((a, b) => rank[a.status] - rank[b.status])[0] ?? null;
  const weakestLeg = [...commandLegs].sort((a, b) => rank[b.status] - rank[a.status])[0] ?? null;
  const annotated = commandLegs.map((leg) => ({
    ...leg,
    isStrongest: strongestLeg?.legId === leg.legId,
    isWeakest: weakestLeg?.legId === leg.legId
  }));
  const pressure = derivePressure(annotated);
  const gameScript = deriveGameScript(ticket, pressure);
  const attention = weakestLeg
    ? `${weakestLeg.player} ${weakestLeg.marketLabel} is ${weakestLeg.status} and now carries the most failure risk.`
    : 'Track the live ticket and watch for the weakest leg to separate.';
  const primaryFailurePoint = weakestLeg ? weakestLeg.riskNote : 'No failure point identified yet.';
  const recommendation =
    pressure === 'High'
      ? 'Stay on the weakest leg first; the rest of the ticket matters less until it stabilizes.'
      : pressure === 'Medium'
        ? 'Monitor the weakest leg and the carrying leg together before making any reactionary move.'
        : 'The ticket is holding shape. Keep watching the carrying leg and any late-game script shift.';

  return {
    stage: 'live',
    headline: 'Live ticket command surface',
    badge: `${pressure} pressure`,
    attention,
    ticketPressure: pressure,
    gameScript,
    strongestLeg: strongestLeg
      ? (annotated.find((leg) => leg.legId === strongestLeg.legId) ?? strongestLeg)
      : null,
    weakestLeg: weakestLeg
      ? (annotated.find((leg) => leg.legId === weakestLeg.legId) ?? weakestLeg)
      : null,
    primaryFailurePoint,
    recommendation,
    legs: annotated
  };
}
