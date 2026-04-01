import { describe, expect, it } from 'vitest';

import {
  deriveAfterLifecycleRisk,
  deriveLiveLifecycleRisk,
  derivePreSubmitLifecycleRisk
} from '@/src/core/slips/lifecycleRisk';
import type { PostmortemRecord } from '@/src/core/review/types';

const settledPostmortem: PostmortemRecord = {
  ticketId: 'ticket-1',
  createdAt: '2026-03-22T00:00:00.000Z',
  settledAt: '2026-03-22T03:00:00.000Z',
  status: 'lost',
  legs: [
    {
      legId: 'l1',
      player: 'Player A',
      statType: 'assists',
      target: 7.5,
      finalValue: 6,
      delta: -1.5,
      hit: false,
      missTags: ['late_fade'],
      missNarrative: 'Faded late.',
      lessonHint: 'Late-game dependency mattered.'
    },
    {
      legId: 'l2',
      player: 'Player B',
      statType: 'points',
      target: 22.5,
      finalValue: 25,
      delta: 2.5,
      hit: true,
      missTags: [],
      missNarrative: 'Cleared.',
      lessonHint: 'Stable.'
    }
  ],
  coverage: { level: 'full', reasons: [] },
  fragility: { score: 71, chips: ['Late dependence'] },
  narrative: []
};

describe('lifecycleRisk', () => {
  it('keeps all-strong tickets in a stable band', () => {
    const risk = derivePreSubmitLifecycleRisk({
      sampleSize: 5,
      confidenceLevel: 'medium',
      matchedTags: [],
      aggressiveLegs: 0,
      correlatedLegs: 0,
      blowoutLegs: 0,
      volatileLegs: 0
    });

    expect(risk.level).toBe('stable');
    expect(risk.primaryDriver).toBe('balanced_build');
  });

  it('selects a single dominant fragility driver deterministically', () => {
    const risk = derivePreSubmitLifecycleRisk({
      sampleSize: 6,
      confidenceLevel: 'high',
      matchedTags: ['correlated_legs', 'line_too_aggressive'],
      aggressiveLegs: 2,
      correlatedLegs: 4,
      blowoutLegs: 0,
      volatileLegs: 1
    });

    expect(risk.primaryDriver).toBe('correlated_stack_pressure');
    expect(risk.secondaryDriver).toBe('inflated_thresholds');
    expect(risk.level).toBe('high-pressure');
  });

  it('falls back to low-evidence when prior support is thin', () => {
    const risk = derivePreSubmitLifecycleRisk({
      sampleSize: 1,
      confidenceLevel: 'low',
      matchedTags: [],
      aggressiveLegs: 0,
      correlatedLegs: 0,
      blowoutLegs: 0,
      volatileLegs: 0
    });

    expect(risk.primaryDriver).toBe('low_evidence');
    expect(risk.reliability).toBe('low');
  });

  it('carries the same driver from before into during when live pressure confirms it', () => {
    const live = deriveLiveLifecycleRisk({
      behindCount: 2,
      criticalCount: 1,
      carryingCount: 1,
      sameGameStack: true,
      volatileLegs: 1,
      minutesRiskLegs: 0,
      pregameDriver: 'correlated_stack_pressure',
      pregameLevel: 'fragile'
    });

    expect(live.primaryDriver).toBe('correlated_stack_pressure');
    expect(live.carriedThrough).toBe(true);
  });

  it('handles conflicting weaker signals without losing deterministic ordering', () => {
    const live = deriveLiveLifecycleRisk({
      behindCount: 1,
      criticalCount: 0,
      carryingCount: 2,
      sameGameStack: false,
      volatileLegs: 2,
      minutesRiskLegs: 1,
      pregameDriver: null,
      pregameLevel: null
    });

    expect(live.primaryDriver).toBe('late_game_dependency');
    expect(live.secondaryDriver).toBe('volatile_secondary_stats');
  });

  it('treats push/void-heavy closes conservatively instead of forcing causality', () => {
    const after = deriveAfterLifecycleRisk({
      outcome: 'void',
      causeTags: [],
      confidenceLevel: 'low'
    });

    expect(after.level).toBe('stable');
    expect(after.primaryDriver).toBe('low_evidence');
  });

  it('shows the same driver carrying through into AFTER when settlement supports it', () => {
    const after = deriveAfterLifecycleRisk({
      postmortem: settledPostmortem,
      causeTags: ['late_game_inactivity'],
      confidenceLevel: 'high',
      pregameDriver: 'late_game_dependency',
      liveDriver: 'late_game_dependency',
      outcome: 'lost'
    });

    expect(after.primaryDriver).toBe('late_game_dependency');
    expect(after.carriedThrough).toBe(true);
    expect(after.headline).toMatch(/carried through/i);
  });

  it('uses persisted lineage to mark carry-through instead of proxy-only inference', () => {
    const after = deriveAfterLifecycleRisk({
      causeTags: ['line_too_aggressive'],
      confidenceLevel: 'medium',
      outcome: 'lost',
      lifecycleLineage: {
        pregame: {
          canonical_leg_id: 'leg-9',
          stage_role: 'candidate',
          source_stage: 'slip',
          continuity_status: 'newly_observed',
          supporting_drivers: ['inflated_thresholds']
        },
        settled: {
          canonical_leg_id: 'leg-9',
          stage_role: 'breaking_leg',
          source_stage: 'review',
          continuity_status: 'carried_forward',
          supporting_drivers: ['inflated_thresholds']
        }
      }
    });

    expect(after.carriedThrough).toBe(true);
    expect(after.continuityTags).toContain('Risk carried through');
  });
});
