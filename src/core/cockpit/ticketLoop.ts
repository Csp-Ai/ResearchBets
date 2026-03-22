import type { OpenTicket, LiveLegState } from '@/src/core/live/openTickets';
import type { PostmortemRecord } from '@/src/core/review/types';

export type BettorLegStatus =
  | 'cleared'
  | 'ahead of pace'
  | 'on pace'
  | 'slightly behind'
  | 'behind pace'
  | 'critical'
  | 'in progress'
  | 'awaiting movement'
  | 'needs one event';
export type TicketLoopStage = 'setup' | 'analysis' | 'live' | 'after';
export type TicketPressureTone = 'steady' | 'watch' | 'urgent';

export type LiveCommandLeg = {
  legId: string;
  player: string;
  marketLabel: string;
  status: BettorLegStatus;
  progressLabel: string;
  why: string;
  isStrongest: boolean;
  isWeakest: boolean;
};

export type TicketPressureSummary = {
  label:
    | 'Stable'
    | 'Pressure rising'
    | 'One-leg fragile'
    | 'Multiple legs behind'
    | 'Close to clearing'
    | 'Carrying well, one weak spot remains';
  detail: string;
  tone: TicketPressureTone;
};

export type LiveCommandSurface = {
  stage: TicketLoopStage;
  headline: string;
  badge: string;
  attention: string;
  ticketPressure: TicketPressureSummary;
  gameScript: string;
  strongestLeg: LiveCommandLeg | null;
  weakestLeg: LiveCommandLeg | null;
  primaryFailurePoint: string;
  recommendation: string;
  nextActionLabel: string;
  legs: LiveCommandLeg[];
};

const rank: Record<BettorLegStatus, number> = {
  cleared: 0,
  'ahead of pace': 1,
  'needs one event': 2,
  'on pace': 3,
  'in progress': 4,
  'slightly behind': 5,
  'awaiting movement': 6,
  'behind pace': 7,
  critical: 8
};

const toMarketLabel = (leg: Pick<LiveLegState, 'marketType' | 'threshold'>) =>
  `${leg.marketType} ${leg.threshold}`;

export function classifyBettorLegStatus(leg: LiveLegState): BettorLegStatus {
  if (leg.currentValue >= leg.threshold) return 'cleared';
  if (leg.requiredRemaining <= 1) return 'needs one event';
  if (leg.coverage.coverage === 'missing')
    return leg.currentValue > 0 ? 'in progress' : 'awaiting movement';
  if (leg.status === 'ahead') return 'ahead of pace';
  if (leg.status === 'on_pace') return 'on pace';
  if (leg.status === 'behind')
    return leg.requiredRemaining <= 2 ? 'slightly behind' : 'behind pace';
  if (leg.status === 'needs_spike')
    return leg.requiredRemaining <= 2 ? 'awaiting movement' : 'critical';
  if (leg.currentValue > 0) return 'in progress';
  return 'awaiting movement';
}

export function explainBettorLeg(leg: LiveLegState, status: BettorLegStatus): string {
  if (status === 'cleared') return 'Already cleared and no longer adds pressure.';
  if (status === 'needs one event') return 'One clean event clears this leg.';
  if (leg.minutesRisk) return 'Minutes risk is rising with the current margin.';
  if (status === 'ahead of pace') return 'Current game flow is carrying this leg.';
  if (status === 'on pace') return 'Volume is landing where it needs to.';
  if (status === 'slightly behind') return 'A small push gets this leg back on track.';
  if (status === 'behind pace') return 'This leg still needs volume in the current script.';
  if (status === 'critical') return 'This leg is now driving most of the failure risk.';
  if (status === 'awaiting movement') return 'Still waiting for the next meaningful event.';
  return 'The leg is moving, but it has not separated yet.';
}

function progressLabelFor(leg: LiveLegState, status: BettorLegStatus) {
  if (status === 'cleared')
    return `${leg.currentValue.toFixed(1)} / ${leg.threshold} · already cleared`;
  if (status === 'needs one event')
    return `${leg.currentValue.toFixed(1)} / ${leg.threshold} · one event away`;
  return `${leg.currentValue.toFixed(1)} / ${leg.threshold} · ${status}`;
}

export function selectStrongestLeg(legs: LiveLegState[]): LiveLegState | null {
  return (
    [...legs].sort((a, b) => {
      const statusGap = rank[classifyBettorLegStatus(a)] - rank[classifyBettorLegStatus(b)];
      if (statusGap !== 0) return statusGap;
      return a.requiredRemaining - b.requiredRemaining;
    })[0] ?? null
  );
}

export function selectWeakestLeg(legs: LiveLegState[]): LiveLegState | null {
  return (
    [...legs].sort((a, b) => {
      const statusGap = rank[classifyBettorLegStatus(b)] - rank[classifyBettorLegStatus(a)];
      if (statusGap !== 0) return statusGap;
      return b.requiredRemaining - a.requiredRemaining;
    })[0] ?? null
  );
}

export function summarizeTicketPressure(legs: LiveCommandLeg[]): TicketPressureSummary {
  const cleared = legs.filter((leg) => leg.status === 'cleared').length;
  const carrying = legs.filter((leg) =>
    ['cleared', 'ahead of pace', 'on pace', 'needs one event'].includes(leg.status)
  ).length;
  const behind = legs.filter((leg) =>
    ['slightly behind', 'behind pace', 'critical', 'awaiting movement'].includes(leg.status)
  ).length;
  const critical = legs.filter((leg) => leg.status === 'critical').length;

  if (cleared === legs.length && legs.length > 0) {
    return {
      label: 'Close to clearing',
      detail: 'Every tracked leg is effectively home.',
      tone: 'steady'
    };
  }
  if (critical > 0 && behind > 1) {
    return {
      label: 'Multiple legs behind',
      detail: 'Concern is spread across more than one leg right now.',
      tone: 'urgent'
    };
  }
  if (critical > 0 || behind >= Math.max(2, Math.ceil(legs.length / 2))) {
    return {
      label: 'Pressure rising',
      detail: 'Too many legs are lagging for the ticket to feel stable.',
      tone: 'urgent'
    };
  }
  if (behind === 1 && carrying >= Math.max(1, legs.length - 1)) {
    return {
      label: 'Carrying well, one weak spot remains',
      detail: 'Most of the ticket is holding, but one leg still decides it.',
      tone: 'watch'
    };
  }
  if (behind === 1) {
    return {
      label: 'One-leg fragile',
      detail: 'The risk is concentrated in a single leg instead of systemic.',
      tone: 'watch'
    };
  }
  if (carrying === legs.length && legs.some((leg) => leg.status !== 'cleared')) {
    return {
      label: 'Stable',
      detail: 'The ticket is holding shape without a clear break point yet.',
      tone: 'steady'
    };
  }
  return {
    label: 'Close to clearing',
    detail: 'Only a small amount of work remains across the ticket.',
    tone: 'steady'
  };
}

function deriveGameScript(ticket: OpenTicket, pressure: TicketPressureSummary) {
  const highVariance = ticket.legs.filter((leg) => leg.volatility === 'high').length;
  const lateWindow = ticket.legs.some((leg) => (leg.liveClock?.quarter ?? 1) >= 3);
  if (ticket.legs.some((leg) => leg.minutesRisk))
    return 'Margin risk is rising, so minutes-sensitive legs need attention.';
  if (highVariance >= 2 && pressure.tone !== 'steady')
    return 'Higher-variance legs are creating most of the swing right now.';
  if (lateWindow && pressure.tone === 'steady')
    return 'The script looks stable enough for the ticket to keep grinding.';
  return 'Current game flow is mixed, so the weakest leg matters more than the broad script.';
}

function toCommandLeg(raw: LiveLegState): LiveCommandLeg {
  const status = classifyBettorLegStatus(raw);
  return {
    legId: raw.legId,
    player: raw.player,
    marketLabel: toMarketLabel(raw),
    status,
    progressLabel: progressLabelFor(raw, status),
    why: explainBettorLeg(raw, status),
    isStrongest: false,
    isWeakest: false
  };
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
        ticketPressure: {
          label: 'Stable',
          detail: 'The ticket is settled and ready for review.',
          tone: 'steady'
        },
        gameScript: postmortem.narrative[2] ?? 'Outcome is settled.',
        strongestLeg: null,
        weakestLeg: null,
        primaryFailurePoint: postmortem.narrative[1] ?? 'Outcome settled.',
        recommendation: 'Open postmortem to see why the ticket won or failed.',
        nextActionLabel: 'Open review',
        legs: []
      };
    }
    return null;
  }

  const commandLegs = ticket.legs.map(toCommandLeg);
  const strongestRaw = selectStrongestLeg(ticket.legs);
  const weakestRaw = selectWeakestLeg(ticket.legs);
  const annotated = commandLegs.map((leg) => ({
    ...leg,
    isStrongest: strongestRaw?.legId === leg.legId,
    isWeakest: weakestRaw?.legId === leg.legId
  }));
  const strongestLeg = annotated.find((leg) => leg.isStrongest) ?? null;
  const weakestLeg = annotated.find((leg) => leg.isWeakest) ?? null;
  const ticketPressure = summarizeTicketPressure(annotated);
  const gameScript = deriveGameScript(ticket, ticketPressure);
  const attention =
    strongestLeg && weakestLeg
      ? `Strongest leg: ${strongestLeg.player} ${strongestLeg.marketLabel} — ${strongestLeg.status}. Weakest leg: ${weakestLeg.player} ${weakestLeg.marketLabel} — ${weakestLeg.status}.`
      : 'Track the live ticket and watch for the weakest leg to separate.';
  const primaryFailurePoint = weakestLeg?.why ?? 'No failure point identified yet.';
  const recommendation =
    ticketPressure.tone === 'urgent'
      ? 'Stay on the weakest leg first; the rest of the ticket matters less until it stabilizes.'
      : ticketPressure.tone === 'watch'
        ? 'Keep the carrying leg in view, but watch the weak spot for the next swing.'
        : 'The ticket is holding shape. Keep watching for a late-game script change.';

  return {
    stage: 'live',
    headline: 'Live ticket command center',
    badge: ticketPressure.label,
    attention,
    ticketPressure,
    gameScript,
    strongestLeg,
    weakestLeg,
    primaryFailurePoint,
    recommendation,
    nextActionLabel: ticket.coverage.coverage === 'full' ? 'Continue tracking' : 'Open live ticket',
    legs: annotated
  };
}
