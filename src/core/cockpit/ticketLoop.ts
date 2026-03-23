import type { OpenTicket, LiveLegState } from '@/src/core/live/openTickets';
import type { PostmortemRecord } from '@/src/core/review/types';
import type { SlipTrackingState, TrackedLegState } from '@/src/core/slips/trackingTypes';
import type { LifecycleRisk } from '@/src/core/slips/lifecycleRisk';
import type { LifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import { deriveLifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import type { LifecycleEvidence } from '@/src/core/slips/lifecycleEvidence';
import { deriveLifecycleEvidence } from '@/src/core/slips/lifecycleEvidence';
import { deriveAfterLifecycleRisk, deriveLiveLifecycleRisk } from '@/src/core/slips/lifecycleRisk';

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
export type AfterLegStatus = 'cleared' | 'breaking leg' | 'missed' | 'void' | 'push';
export type CommandLegStatus = BettorLegStatus | AfterLegStatus;
export type TicketLoopStage = 'setup' | 'analysis' | 'live' | 'after';
export type TicketPressureTone = 'steady' | 'watch' | 'urgent';
export type AfterOutcomeTone = 'positive' | 'neutral' | 'caution' | 'negative';

export type LiveCommandLeg = {
  legId: string;
  player: string;
  marketLabel: string;
  status: CommandLegStatus;
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

export type AfterCommandSurface = {
  lifecycleRisk: LifecycleRisk;
  actionGuidance: LifecycleActionGuidance;
  actionEvidence: LifecycleEvidence;
  outcomeLabel: 'Won' | 'Lost' | 'Partial' | 'Void' | 'Mixed' | 'Review';
  outcomeTone: AfterOutcomeTone;
  closingHeadline: string;
  decidedBy: string;
  winningLegHighlight: LiveCommandLeg | null;
  breakingLegHighlight: LiveCommandLeg | null;
  nearMissHighlight: string | null;
  lesson: string;
  nextActionHref: string;
};

export type LiveCommandSurface = {
  lifecycleRisk: LifecycleRisk;
  actionGuidance: LifecycleActionGuidance;
  actionEvidence: LifecycleEvidence;
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
  nextActionHref?: string;
  legs: LiveCommandLeg[];
  after?: AfterCommandSurface;
};

type AfterSourceLeg = {
  legId: string;
  player: string;
  marketLabel: string;
  status: AfterLegStatus;
  delta?: number | null;
  why: string;
  lesson?: string;
};

type AfterSource = {
  ticketId: string;
  trace_id?: string;
  slip_id?: string;
  provenanceHint?: string;
  legs: AfterSourceLeg[];
  nextTimeTitle?: string;
  nextTimeBody?: string;
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

const afterRank: Record<AfterLegStatus, number> = {
  'breaking leg': 0,
  missed: 1,
  push: 2,
  void: 3,
  cleared: 4
};

const stablePressure: TicketPressureSummary = {
  label: 'Stable',
  detail: 'The ticket is settled and ready for review.',
  tone: 'steady'
};

function pressureSummaryFromRisk(
  risk: LifecycleRisk,
  fallback: TicketPressureSummary
): TicketPressureSummary {
  const tone =
    risk.level === 'high-pressure'
      ? 'urgent'
      : risk.level === 'fragile' || risk.level === 'watch'
        ? 'watch'
        : 'steady';
  return {
    label:
      risk.level === 'stable'
        ? 'Stable'
        : risk.level === 'watch'
          ? 'Pressure rising'
          : risk.level === 'fragile'
            ? 'One-leg fragile'
            : 'Multiple legs behind',
    detail: risk.detail || fallback.detail,
    tone
  };
}

const toMarketLabel = (leg: Pick<LiveLegState, 'marketType' | 'threshold'>) =>
  `${leg.marketType} ${leg.threshold}`;

function buildAfterHref(basePath: string, input: { trace_id?: string; slip_id?: string }) {
  const params = new URLSearchParams();
  if (input.trace_id) params.set('trace_id', input.trace_id);
  if (input.slip_id) params.set('slip_id', input.slip_id);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function isNearMiss(delta?: number | null) {
  return typeof delta === 'number' && delta < 0 && Math.abs(delta) <= 1;
}

function toAfterOutcomeLabel(legs: AfterSourceLeg[]): AfterCommandSurface['outcomeLabel'] {
  const missed = legs.filter(
    (leg) => leg.status === 'breaking leg' || leg.status === 'missed'
  ).length;
  const cleared = legs.filter((leg) => leg.status === 'cleared').length;
  const voided = legs.filter((leg) => leg.status === 'void' || leg.status === 'push').length;

  if (legs.length === 0) return 'Review';
  if (cleared === legs.length) return 'Won';
  if (voided === legs.length) return 'Void';
  if (missed > 0 && cleared === 0 && voided === 0) return 'Lost';
  if (missed === 0 && cleared > 0 && voided > 0) return 'Partial';
  if (missed > 0 && (cleared > 0 || voided > 0)) return 'Mixed';
  return 'Review';
}

function toAfterOutcomeTone(label: AfterCommandSurface['outcomeLabel']): AfterOutcomeTone {
  if (label === 'Won') return 'positive';
  if (label === 'Void' || label === 'Review') return 'neutral';
  if (label === 'Partial' || label === 'Mixed') return 'caution';
  return 'negative';
}

function sortAfterLegs(legs: AfterSourceLeg[]) {
  return [...legs].sort((a, b) => {
    const statusGap = afterRank[a.status] - afterRank[b.status];
    if (statusGap !== 0) return statusGap;
    const deltaA = typeof a.delta === 'number' ? a.delta : Number.POSITIVE_INFINITY;
    const deltaB = typeof b.delta === 'number' ? b.delta : Number.POSITIVE_INFINITY;
    return deltaA - deltaB;
  });
}

function describeDecidingLeg(
  leg: AfterSourceLeg | null,
  outcomeLabel: AfterCommandSurface['outcomeLabel']
) {
  if (!leg) {
    return outcomeLabel === 'Won'
      ? 'Every leg cleared, so no single break point decided the ticket.'
      : 'No single deciding leg was preserved for review.';
  }
  if (leg.status === 'breaking leg') {
    return `${leg.player} ${leg.marketLabel} broke the ticket.`;
  }
  if (leg.status === 'missed') {
    return `${leg.player} ${leg.marketLabel} missed and kept the ticket from closing cleanly.`;
  }
  if (leg.status === 'push') {
    return `${leg.player} ${leg.marketLabel} pushed, so the payout depended on the remaining legs.`;
  }
  if (leg.status === 'void') {
    return `${leg.player} ${leg.marketLabel} voided, so the closing result came from the rest of the slip.`;
  }
  return `${leg.player} ${leg.marketLabel} helped carry the close.`;
}

function buildClosingHeadline(
  outcomeLabel: AfterCommandSurface['outcomeLabel'],
  winningLeg: AfterSourceLeg | null,
  breakingLeg: AfterSourceLeg | null,
  brokenCount: number
) {
  if (outcomeLabel === 'Won') {
    return winningLeg
      ? `Ticket closed cleanly behind ${winningLeg.player}.`
      : 'Ticket closed cleanly with every leg home.';
  }
  if (outcomeLabel === 'Lost') {
    if (brokenCount <= 1 && breakingLeg) return `Ticket ended on ${breakingLeg.player}.`;
    return `Ticket ended with ${brokenCount} breaking legs.`;
  }
  if (outcomeLabel === 'Partial') return 'Ticket closed with wins plus void/push relief.';
  if (outcomeLabel === 'Mixed')
    return 'Ticket closed mixed with one result cluster doing the damage.';
  if (outcomeLabel === 'Void') return 'Ticket closed without a graded edge.';
  return 'Outcome review is ready.';
}

function buildNearMissHighlight(source: AfterSource, breakingLeg: AfterSourceLeg | null) {
  const nearMiss = source.legs.find((leg) => isNearMiss(leg.delta));
  if (!nearMiss) {
    return breakingLeg
      ? 'Near-miss evidence was not preserved, so keep the review at the leg-result level.'
      : null;
  }
  const gap = Math.abs(nearMiss.delta ?? 0).toFixed(1);
  return `${nearMiss.player} ${nearMiss.marketLabel} finished ${gap} short, so the ticket was closer than the final result alone suggests.`;
}

function buildLesson(
  source: AfterSource,
  outcomeLabel: AfterCommandSurface['outcomeLabel'],
  breakingLeg: AfterSourceLeg | null
) {
  if (source.nextTimeBody) return source.nextTimeBody;
  if (breakingLeg?.lesson) return breakingLeg.lesson;
  if (outcomeLabel === 'Won')
    return 'Bank the process note: strongest-leg support held through settlement, so keep the same build discipline next run.';
  if (outcomeLabel === 'Void')
    return 'No graded edge was preserved here, so avoid forcing a lesson beyond the recorded void/push result.';
  if (outcomeLabel === 'Partial' || outcomeLabel === 'Mixed')
    return 'Separate the clearing legs from the broken cluster before you rebuild; the slip did not fail as one clean story.';
  return 'Review the breaking leg first, then decide whether the miss was process, price, or pure variance before the next slip.';
}

function buildNextAction(
  source: AfterSource,
  outcomeLabel: AfterCommandSurface['outcomeLabel']
): Pick<AfterCommandSurface, 'nextActionHref'> & { label: string } {
  if (source.trace_id || source.slip_id) {
    return {
      label: 'Open review',
      nextActionHref: buildAfterHref('/control', {
        trace_id: source.trace_id,
        slip_id: source.slip_id
      })
    };
  }
  return {
    label: outcomeLabel === 'Won' ? 'Build next slip' : 'Open archive',
    nextActionHref: outcomeLabel === 'Won' ? '/cockpit' : '/history'
  };
}

function toAfterCommandLeg(
  leg: AfterSourceLeg,
  strongest: AfterSourceLeg | null,
  weakest: AfterSourceLeg | null
): LiveCommandLeg {
  return {
    legId: leg.legId,
    player: leg.player,
    marketLabel: leg.marketLabel,
    status: leg.status,
    progressLabel:
      typeof leg.delta === 'number'
        ? `${leg.status} · ${leg.delta >= 0 ? '+' : ''}${leg.delta.toFixed(1)} vs line`
        : leg.status,
    why: leg.why,
    isStrongest: strongest?.legId === leg.legId,
    isWeakest: weakest?.legId === leg.legId
  };
}

function deriveAfterSourceFromPostmortem(postmortem: PostmortemRecord): AfterSource {
  const missedLegIds = new Set(postmortem.legs.filter((leg) => !leg.hit).map((leg) => leg.legId));
  const firstBreakingLegId = postmortem.legs.find((leg) => !leg.hit)?.legId;
  return {
    ticketId: postmortem.ticketId,
    trace_id: postmortem.trace_id,
    slip_id: postmortem.slip_id,
    provenanceHint: postmortem.provenance?.source_type,
    nextTimeTitle: postmortem.nextTimeRule?.title,
    nextTimeBody: postmortem.nextTimeRule?.body,
    legs: postmortem.legs.map((leg) => ({
      legId: leg.legId,
      player: leg.player,
      marketLabel: `${leg.statType} ${leg.target}`,
      status: leg.hit ? 'cleared' : leg.legId === firstBreakingLegId ? 'breaking leg' : 'missed',
      delta: leg.delta,
      why: leg.hit ? 'Cleared and carried its share of the ticket.' : leg.missNarrative,
      lesson: leg.lessonHint
    }))
  };
}

function toTrackingLegStatus(leg: TrackedLegState, firstBreakingLegId?: string): AfterLegStatus {
  if (leg.outcome === 'void') return 'void';
  if (leg.outcome === 'push') return 'push';
  if (leg.outcome === 'hit') return 'cleared';
  if (leg.outcome === 'miss') return leg.legId === firstBreakingLegId ? 'breaking leg' : 'missed';
  return 'missed';
}

function deriveAfterSourceFromTracking(state: SlipTrackingState): AfterSource {
  const firstBreakingLegId =
    state.eliminatedByLegId ?? state.legs.find((leg) => leg.outcome === 'miss')?.legId;
  return {
    ticketId: state.slipId,
    trace_id: state.trace_id,
    slip_id: state.slipId,
    legs: state.legs
      .filter((leg) => leg.outcome !== 'pending')
      .map((leg) => {
        const targetValue =
          typeof leg.targetValue === 'number' ? leg.targetValue : Number(leg.line);
        const currentValue = typeof leg.currentValue === 'number' ? leg.currentValue : null;
        const delta =
          Number.isFinite(targetValue) && typeof currentValue === 'number'
            ? Number((currentValue - targetValue).toFixed(1))
            : null;
        return {
          legId: leg.legId,
          player: leg.player,
          marketLabel: `${leg.market} ${leg.line}`,
          status: toTrackingLegStatus(leg, firstBreakingLegId),
          delta,
          why:
            leg.outcome === 'hit'
              ? 'Cleared and stayed on the right side of settlement.'
              : leg.outcome === 'void'
                ? 'Voided at settlement, so it stopped affecting the ticket.'
                : leg.outcome === 'push'
                  ? 'Pushed at the number, so the other legs decided the close.'
                  : leg.missType
                    ? `${leg.missType} miss closed this leg short of the line.`
                    : 'Closed short of the line at settlement.',
          lesson:
            leg.outcome === 'miss'
              ? leg.missType === 'variance' || leg.missType === 'unknown'
                ? 'Treat this as variance first; do not auto-blacklist the angle from one result.'
                : 'Tag the break reason before rebuilding the same exposure cluster.'
              : undefined
        };
      })
  };
}

export function deriveAfterCommandSurface(
  sourceInput: PostmortemRecord | SlipTrackingState | null | undefined
): LiveCommandSurface | null {
  if (!sourceInput) return null;
  const source =
    'settledAt' in sourceInput
      ? deriveAfterSourceFromPostmortem(sourceInput)
      : deriveAfterSourceFromTracking(sourceInput);
  const sortedLegs = sortAfterLegs(source.legs);
  const breakingLeg =
    sortedLegs.find((leg) => leg.status === 'breaking leg' || leg.status === 'missed') ?? null;
  const winningLeg =
    [...source.legs]
      .filter((leg) => leg.status === 'cleared')
      .sort(
        (a, b) => (b.delta ?? Number.NEGATIVE_INFINITY) - (a.delta ?? Number.NEGATIVE_INFINITY)
      )[0] ?? null;
  const outcomeLabel = toAfterOutcomeLabel(source.legs);
  const outcomeTone = toAfterOutcomeTone(outcomeLabel);
  const brokenCount = source.legs.filter(
    (leg) => leg.status === 'breaking leg' || leg.status === 'missed'
  ).length;
  const nextAction = buildNextAction(source, outcomeLabel);
  const annotated = source.legs.map((leg) => toAfterCommandLeg(leg, winningLeg, breakingLeg));
  const winningLegHighlight = annotated.find((leg) => leg.isStrongest) ?? null;
  const breakingLegHighlight = annotated.find((leg) => leg.isWeakest) ?? null;
  const decidedBy = describeDecidingLeg(breakingLeg, outcomeLabel);
  const nearMissHighlight = buildNearMissHighlight(source, breakingLeg);
  const lesson = buildLesson(source, outcomeLabel, breakingLeg);
  const afterOutcome =
    outcomeLabel === 'Won'
      ? 'won'
      : outcomeLabel === 'Lost'
        ? 'lost'
        : outcomeLabel === 'Void'
          ? 'void'
          : outcomeLabel === 'Partial'
            ? 'partial'
            : 'mixed';
  const lifecycleRisk = deriveAfterLifecycleRisk({
    postmortem: 'settledAt' in sourceInput ? sourceInput : undefined,
    outcome: afterOutcome
  });
  const actionGuidance = deriveLifecycleActionGuidance({
    risk: lifecycleRisk,
    stage: 'after',
    outcome: afterOutcome
  });
  const voidHeavyCount = source.legs.filter(
    (leg) => leg.status === 'void' || leg.status === 'push'
  ).length;
  const actionEvidence = deriveLifecycleEvidence({
    risk: lifecycleRisk,
    guidance: actionGuidance,
    stage: 'after',
    continuity: {
      strongest_leg_label: winningLeg?.player ?? null,
      weakest_leg_label: breakingLeg?.player ?? null,
      mixed_outcome: outcomeLabel === 'Mixed' || outcomeLabel === 'Partial',
      push_void_heavy: source.legs.length > 0 && voidHeavyCount >= Math.ceil(source.legs.length / 2)
    }
  });

  return {
    stage: 'after',
    lifecycleRisk,
    actionGuidance,
    actionEvidence,
    headline: lifecycleRisk.headline,
    badge: outcomeLabel,
    attention: decidedBy,
    ticketPressure: pressureSummaryFromRisk(lifecycleRisk, stablePressure),
    gameScript:
      source.provenanceHint === 'demo_sample'
        ? 'Demo settlement stays deterministic so the review keeps the same command language.'
        : `${lifecycleRisk.pressureLabel} · ${lifecycleRisk.detail}`,
    strongestLeg: winningLegHighlight,
    weakestLeg: breakingLegHighlight,
    primaryFailurePoint: breakingLegHighlight?.why ?? decidedBy,
    recommendation: `${actionGuidance.action_label} · ${actionGuidance.action_rationale}`,
    nextActionLabel: nextAction.label,
    nextActionHref: nextAction.nextActionHref,
    legs: annotated,
    after: {
      lifecycleRisk,
      actionGuidance,
      actionEvidence,
      outcomeLabel,
      outcomeTone,
      closingHeadline: buildClosingHeadline(outcomeLabel, winningLeg, breakingLeg, brokenCount),
      decidedBy,
      winningLegHighlight,
      breakingLegHighlight,
      nearMissHighlight,
      lesson,
      nextActionHref: nextAction.nextActionHref
    }
  };
}

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
  if (!ticket) return deriveAfterCommandSurface(postmortem);

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
  const defaultPressure = summarizeTicketPressure(annotated);
  const lifecycleRisk = deriveLiveLifecycleRisk({
    behindCount: annotated.filter((leg) =>
      ['slightly behind', 'behind pace', 'critical', 'awaiting movement'].includes(leg.status)
    ).length,
    criticalCount: annotated.filter((leg) => leg.status === 'critical').length,
    carryingCount: annotated.filter((leg) =>
      ['cleared', 'ahead of pace', 'on pace', 'needs one event'].includes(leg.status)
    ).length,
    sameGameStack: new Set(ticket.legs.map((leg) => leg.gameId)).size < ticket.legs.length,
    volatileLegs: ticket.legs.filter((leg) => leg.volatility === 'high').length,
    minutesRiskLegs: ticket.legs.filter((leg) => leg.minutesRisk).length,
    weakestReasons: weakestRaw?.reasonChips,
    pregameDriver: null,
    pregameLevel: null
  });
  const ticketPressure = pressureSummaryFromRisk(lifecycleRisk, defaultPressure);
  const actionGuidance = deriveLifecycleActionGuidance({ risk: lifecycleRisk, stage: 'during' });
  const actionEvidence = deriveLifecycleEvidence({
    risk: lifecycleRisk,
    guidance: actionGuidance,
    stage: 'during',
    continuity: {
      strongest_leg_label: strongestLeg?.player ?? null,
      weakest_leg_label: weakestLeg?.player ?? null
    }
  });
  const gameScript = deriveGameScript(ticket, ticketPressure);
  const attention =
    strongestLeg && weakestLeg
      ? `Strongest leg: ${strongestLeg.player} ${strongestLeg.marketLabel} — ${strongestLeg.status}. Weakest leg: ${weakestLeg.player} ${weakestLeg.marketLabel} — ${weakestLeg.status}.`
      : 'Track the live ticket and watch for the weakest leg to separate.';
  const primaryFailurePoint = weakestLeg?.why ?? 'No failure point identified yet.';
  const recommendation = `${actionGuidance.action_label} · ${actionGuidance.action_rationale}`;

  return {
    stage: 'live',
    lifecycleRisk,
    actionGuidance,
    actionEvidence,
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
