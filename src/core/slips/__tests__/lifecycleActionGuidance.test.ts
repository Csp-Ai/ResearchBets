import { describe, expect, it } from 'vitest';

import { deriveLifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import type { LifecycleRisk } from '@/src/core/slips/lifecycleRisk';

function buildRisk(overrides: Partial<LifecycleRisk> = {}): LifecycleRisk {
  return {
    level: 'stable',
    pressureLabel: 'Stable',
    primaryDriver: 'balanced_build',
    secondaryDriver: null,
    reliability: 'high',
    headline: 'Stable build so far.',
    detail: 'No single deterministic fragility driver is dominating this ticket right now.',
    continuityTags: ['Pre-submit'],
    carriedThrough: false,
    evidence: [{ driver: 'balanced_build', score: 10, tag: 'Balanced build' }],
    ...overrides
  };
}

describe('lifecycleActionGuidance', () => {
  it('maps stable BEFORE risk to proceed', () => {
    const guidance = deriveLifecycleActionGuidance({ risk: buildRisk(), stage: 'before' });

    expect(guidance.recommended_action).toBe('proceed');
    expect(guidance.action_label).toBe('Proceed');
  });

  it('maps watch states to cautious or close monitoring depending on stage', () => {
    const risk = buildRisk({
      level: 'watch',
      pressureLabel: 'Watch',
      primaryDriver: 'volatile_secondary_stats',
      headline: 'Volatile secondary stats is the main watch item.'
    });

    expect(deriveLifecycleActionGuidance({ risk, stage: 'before' }).recommended_action).toBe(
      'proceed_cautiously'
    );
    expect(deriveLifecycleActionGuidance({ risk, stage: 'during' }).recommended_action).toBe(
      'monitor_closely'
    );
  });

  it('maps fragile reads to reduce exposure before submit', () => {
    const guidance = deriveLifecycleActionGuidance({
      risk: buildRisk({
        level: 'fragile',
        pressureLabel: 'Fragile',
        primaryDriver: 'correlated_stack_pressure'
      }),
      stage: 'before'
    });

    expect(guidance.recommended_action).toBe('reduce_exposure');
  });

  it('maps high-pressure pre-submit reads to avoid chasing when thresholds are stretched', () => {
    const guidance = deriveLifecycleActionGuidance({
      risk: buildRisk({
        level: 'high-pressure',
        pressureLabel: 'High pressure',
        primaryDriver: 'inflated_thresholds'
      }),
      stage: 'before'
    });

    expect(guidance.recommended_action).toBe('avoid_chasing');
  });

  it('falls back conservatively when evidence is thin', () => {
    const guidance = deriveLifecycleActionGuidance({
      risk: buildRisk({
        level: 'stable',
        primaryDriver: 'low_evidence',
        reliability: 'low',
        continuityTags: ['Thin history'],
        evidence: [{ driver: 'low_evidence', score: 30, tag: 'Low evidence' }]
      }),
      stage: 'before'
    });

    expect(guidance.recommended_action).toBe('proceed_cautiously');
    expect(guidance.continuity_note).toMatch(/thin/i);
  });

  it('highlights continuity-supported carry-through after settlement', () => {
    const guidance = deriveLifecycleActionGuidance({
      risk: buildRisk({
        level: 'fragile',
        pressureLabel: 'Fragile',
        primaryDriver: 'late_game_dependency',
        carriedThrough: true,
        continuityTags: ['Settled review', 'Risk carried through']
      }),
      stage: 'after',
      outcome: 'lost'
    });

    expect(guidance.recommended_action).toBe('review_postmortem');
    expect(guidance.continuity_note).toMatch(/same lifecycle pressure/i);
  });

  it('chooses the dominant deterministic action when weaker drivers conflict', () => {
    const guidance = deriveLifecycleActionGuidance({
      risk: buildRisk({
        level: 'high-pressure',
        pressureLabel: 'High pressure',
        primaryDriver: 'correlated_stack_pressure',
        secondaryDriver: 'volatile_secondary_stats',
        evidence: [
          { driver: 'correlated_stack_pressure', score: 72, tag: 'Correlated stack pressure' },
          { driver: 'volatile_secondary_stats', score: 48, tag: 'Volatile secondary stats' }
        ]
      }),
      stage: 'during'
    });

    expect(guidance.recommended_action).toBe('reduce_exposure');
    expect(guidance.driver_tags).toEqual(
      expect.arrayContaining(['correlated_stack_pressure', 'volatile_secondary_stats'])
    );
  });

  it('sends fragile and high-pressure closes into postmortem review', () => {
    const guidance = deriveLifecycleActionGuidance({
      risk: buildRisk({
        level: 'high-pressure',
        pressureLabel: 'High pressure',
        primaryDriver: 'hot_hand_regression_risk'
      }),
      stage: 'after',
      outcome: 'lost'
    });

    expect(guidance.recommended_action).toBe('review_postmortem');
  });
});
