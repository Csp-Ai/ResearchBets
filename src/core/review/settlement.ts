import type { OpenTicket } from '@/src/core/live/openTickets';
import { tagMiss } from '@/src/core/review/missTagger';
import { getDraftPostmortem, savePostmortem } from '@/src/core/review/store';
import type { PostmortemRecord, TicketSettlementStatus } from '@/src/core/review/types';
import { mapMissTagsToNextTimeRule } from '@/src/core/guardrails/localGuardrails';

export type SettleTicketInput = {
  ticket: OpenTicket;
  status: TicketSettlementStatus;
  finalValues: Record<string, number>;
  cashoutTaken?: number;
};

const endgameSensitivityFor = (leg: OpenTicket['legs'][number]) => {
  if (leg.status === 'needs_spike') return 80;
  if (leg.status === 'behind') return 65;
  return 40;
};

export function createPostmortemRecord(input: SettleTicketInput): PostmortemRecord {
  const settledAt = new Date().toISOString();
  const fragilityChips = [
    ...new Set(input.ticket.legs.flatMap((leg) => leg.reasonChips))
  ].slice(0, 3);
  const fragilityScore = Math.round(input.ticket.legs.reduce((sum, leg) => {
    const base = leg.volatility === 'high' ? 30 : leg.volatility === 'moderate' ? 18 : 8;
    return sum + base + (leg.minutesRisk ? 12 : 0) + (leg.status === 'needs_spike' ? 15 : leg.status === 'behind' ? 8 : 0);
  }, 0) / Math.max(1, input.ticket.legs.length));

  const legs = input.ticket.legs.map((leg) => {
    const candidate = input.finalValues[leg.legId];
    const finalValue = typeof candidate === 'number' ? candidate : leg.currentValue;
    const delta = Number((finalValue - leg.threshold).toFixed(1));
    const hit = delta >= 0;
    const tagged = hit
      ? { missTags: [], missNarrative: 'Leg cleared the target.', lessonHint: 'Keep process stable and avoid overreacting to one result.' }
      : tagMiss({
        statType: leg.marketType,
        target: leg.threshold,
        finalValue,
        delta,
        fragilityScore,
        fragilityChips,
        minutesCompressionRisk: leg.minutesRisk,
        endgameSensitivity: endgameSensitivityFor(leg),
        ladder: leg.reasonChips.includes('Ladder distance'),
        coverage: input.ticket.coverage.coverage
      });

    return {
      legId: leg.legId,
      player: leg.player,
      statType: leg.marketType,
      target: leg.threshold,
      finalValue,
      delta,
      hit,
      missTags: tagged.missTags,
      missNarrative: tagged.missNarrative,
      lessonHint: tagged.lessonHint
    };
  });

  const missed = legs.filter((leg) => !leg.hit);
  const nextTimeRule = mapMissTagsToNextTimeRule(missed.flatMap((leg) => leg.missTags));
  const narrative = [
    `${input.ticket.title} settled ${input.status} with ${missed.length} missed leg(s).`,
    missed[0] ? `${missed[0].player} was the biggest swing (${missed[0].delta.toFixed(1)} vs line).` : 'All tracked legs cleared the line.',
    input.ticket.coverage.coverage === 'full' ? 'Coverage held across all legs.' : `Coverage was ${input.ticket.coverage.coverage}; review gaps before similar builds.`
  ];

  return {
    ticketId: input.ticket.ticketId,
    createdAt: input.ticket.createdAt ?? (input.ticket.ticketId.startsWith('demo-ticket') ? '2026-01-01T00:00:00.000Z' : settledAt),
    settledAt,
    status: input.status,
    cashoutTaken: input.cashoutTaken,
    legs,
    coverage: {
      level: input.ticket.coverage.coverage,
      reasons: input.ticket.legs.filter((leg) => leg.coverage.coverage === 'missing').map((leg) => leg.coverage.reason ?? 'provider_unavailable')
    },
    fragility: { score: fragilityScore, chips: fragilityChips },
    narrative,
    coachSnapshot: getDraftPostmortem(input.ticket.ticketId),
    nextTimeRule
  };
}

export function settleTicket(input: SettleTicketInput): PostmortemRecord {
  const record = createPostmortemRecord(input);
  savePostmortem(record);
  return record;
}
