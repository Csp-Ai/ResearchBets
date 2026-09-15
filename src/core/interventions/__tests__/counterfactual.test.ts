import { describe, expect, it } from 'vitest';

import {
  buildThresholdCounterfactuals,
  evaluateThresholdInterventionCounterfactual,
  THRESHOLD_COUNTERFACTUAL_VERSION,
} from '@/src/core/interventions/counterfactual';
import type { AppliedThresholdIntervention } from '@/src/core/interventions/decisionStore';
import type { OpenTicket } from '@/src/core/live/openTickets';

const intervention: AppliedThresholdIntervention = {
  interventionId: 'trace-1:safety:leg-1:80:60',
  appliedAt: '2026-09-14T20:00:00.000Z',
  traceId: 'trace-1',
  slipId: 'slip-1',
  mode: 'live',
  interventionType: 'safety',
  legId: 'leg-1',
  player: 'Player A',
  marketType: 'receiving_yards',
  currentLine: 80,
  targetLine: 60,
  currentProbability: 0.42,
  targetProbability: 0.63,
  probabilityDelta: 0.21,
};

const verifiedTicket: OpenTicket = {
  ticketId: 'ticket-1',
  title: 'Tracked ticket #1',
  odds: '—',
  wager: '—',
  mode: 'live',
  trace_id: 'trace-1',
  run_id: 'trace-1',
  slip_id: 'slip-1',
  provenance: { mode: 'live', source_type: 'tracked_ticket', review_state: 'verified' },
  legs: [
    {
      legId: 'leg-1',
      gameId: 'A@B',
      player: 'Player A',
      marketType: 'receiving_yards',
      currentValue: 67,
      threshold: 60,
      requiredRemaining: 0,
      paceProjection: 67,
      status: 'ahead',
      volatility: 'moderate',
      minutesRisk: false,
      reasonChips: [],
      coverage: { coverage: 'covered' },
    },
  ],
  onPaceCount: 1,
  weakestLeg: {
    legId: 'leg-1',
    gameId: 'A@B',
    player: 'Player A',
    marketType: 'receiving_yards',
    currentValue: 67,
    threshold: 60,
    requiredRemaining: 0,
    paceProjection: 67,
    status: 'ahead',
    volatility: 'moderate',
    minutesRisk: false,
    reasonChips: [],
    coverage: { coverage: 'covered' },
  },
  coverage: { coverage: 'full', coveredLegs: 1, totalLegs: 1 },
};

describe('threshold intervention counterfactuals', () => {
  it('marks an exact verified step-down as preserving the leg', () => {
    const result = evaluateThresholdInterventionCounterfactual({
      ticket: verifiedTicket,
      intervention,
      finalValues: { 'leg-1': 67 },
    });

    expect(result.methodologyVersion).toBe(THRESHOLD_COUNTERFACTUAL_VERSION);
    expect(result.eligible).toBe(true);
    expect(result.originalLegSurvived).toBe(false);
    expect(result.recommendedLegSurvived).toBe(true);
    expect(result.effect).toBe('preserved_leg');
  });

  it('fails closed when the settlement is reviewed but not verified', () => {
    const result = evaluateThresholdInterventionCounterfactual({
      ticket: {
        ...verifiedTicket,
        provenance: { mode: 'live', source_type: 'tracked_ticket', review_state: 'reviewed' },
      },
      intervention,
      finalValues: { 'leg-1': 67 },
    });

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReason).toBe('settlement_not_verified');
    expect(result.originalLegSurvived).toBeNull();
    expect(result.recommendedLegSurvived).toBeNull();
    expect(result.effect).toBeNull();
  });

  it('fails closed when the tracked ticket does not contain the exact recommended target', () => {
    const result = evaluateThresholdInterventionCounterfactual({
      ticket: {
        ...verifiedTicket,
        legs: [{ ...verifiedTicket.legs[0]!, threshold: 65 }],
      },
      intervention,
      finalValues: { 'leg-1': 67 },
    });

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReason).toBe('target_line_mismatch');
  });

  it('retains the latest applied decision as an explicit ineligible link when the final ticket differs', () => {
    const earlier = { ...intervention, appliedAt: '2026-09-14T19:00:00.000Z' };
    const latest = {
      ...intervention,
      interventionId: 'trace-1:safety:leg-1:80:55',
      appliedAt: '2026-09-14T20:30:00.000Z',
      targetLine: 55,
    };

    const [result] = buildThresholdCounterfactuals({
      ticket: verifiedTicket,
      interventions: [earlier, latest],
      finalValues: { 'leg-1': 67 },
    });

    expect(result?.interventionId).toBe(latest.interventionId);
    expect(result?.eligible).toBe(false);
    expect(result?.ineligibilityReason).toBe('target_line_mismatch');
  });

  it('captures when an applied escalation costs leg survival', () => {
    const escalation: AppliedThresholdIntervention = {
      ...intervention,
      interventionId: 'trace-1:escalation:leg-1:60:80',
      interventionType: 'escalation',
      currentLine: 60,
      targetLine: 80,
    };
    const ticket = {
      ...verifiedTicket,
      legs: [{ ...verifiedTicket.legs[0]!, threshold: 80 }],
    };

    const result = evaluateThresholdInterventionCounterfactual({
      ticket,
      intervention: escalation,
      finalValues: { 'leg-1': 67 },
    });

    expect(result.eligible).toBe(true);
    expect(result.originalLegSurvived).toBe(true);
    expect(result.recommendedLegSurvived).toBe(false);
    expect(result.effect).toBe('cost_leg');
  });
});
