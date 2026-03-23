import { describe, expect, it } from 'vitest';

import { deriveLifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import {
  deriveLifecycleEvidence,
  type LifecycleContinuityEvidenceInput
} from '@/src/core/slips/lifecycleEvidence';
import type { LifecycleRisk } from '@/src/core/slips/lifecycleRisk';
import { deriveTicketThesis } from '@/src/core/slips/ticketThesis';

function buildRisk(overrides: Partial<LifecycleRisk>): LifecycleRisk {
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

function buildThesis(input: {
  stage: 'before' | 'during' | 'after';
  risk: LifecycleRisk;
  continuity?: LifecycleContinuityEvidenceInput;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
}) {
  const guidance = deriveLifecycleActionGuidance({
    risk: input.risk,
    stage: input.stage,
    outcome: input.outcome
  });
  const evidence = deriveLifecycleEvidence({
    risk: input.risk,
    guidance,
    stage: input.stage,
    continuity: input.continuity
  });
  return deriveTicketThesis({
    stage: input.stage,
    risk: input.risk,
    guidance,
    evidence,
    continuity: input.continuity,
    outcome: input.outcome
  });
}

describe('ticketThesis', () => {
  it('builds a stable BEFORE thesis', () => {
    const thesis = buildThesis({ stage: 'before', risk: buildRisk({}) });

    expect(thesis.thesis_status).toBe('holding');
    expect(thesis.headline).toMatch(/stable/i);
    expect(thesis.recommended_next_step).toBe('Proceed');
  });

  it('builds a fragile BEFORE thesis for high-pressure setups', () => {
    const thesis = buildThesis({
      stage: 'before',
      risk: buildRisk({
        level: 'high-pressure',
        pressureLabel: 'High pressure',
        primaryDriver: 'correlated_stack_pressure',
        headline: 'Correlated stack pressure makes this ticket high pressure.',
        detail: 'Too many legs still depend on the same player, game, or script.',
        evidence: [{ driver: 'correlated_stack_pressure', score: 74, tag: 'Correlated stack pressure' }]
      })
    });

    expect(thesis.thesis_status).toBe('under_pressure');
    expect(thesis.current_thesis).toMatch(/fragile ticket/i);
    expect(thesis.recommended_next_step).toMatch(/reduce exposure|avoid chasing/i);
  });

  it('uses a conservative thin-evidence fallback before submit', () => {
    const thesis = buildThesis({
      stage: 'before',
      risk: buildRisk({
        level: 'watch',
        pressureLabel: 'Watch',
        primaryDriver: 'low_evidence',
        reliability: 'low',
        headline: 'Low evidence is the main watch item.',
        detail: 'The signal stays light because the support behind the warning is thin.',
        continuityTags: ['Thin history'],
        evidence: [{ driver: 'low_evidence', score: 30, tag: 'Low evidence' }]
      })
    });

    expect(thesis.thesis_status).toBe('watching');
    expect(thesis.headline).toMatch(/thin evidence/i);
    expect(thesis.reliability_note).toMatch(/thin support/i);
  });

  it('builds a DURING thesis when the original read is holding', () => {
    const thesis = buildThesis({
      stage: 'during',
      risk: buildRisk({
        continuityTags: ['Live'],
        detail: 'No single live driver is breaking the ticket shape right now.'
      }),
      continuity: { strongest_leg_label: 'Jamal Murray', weakest_leg_label: 'Aaron Gordon' }
    });

    expect(thesis.thesis_status).toBe('holding');
    expect(thesis.headline).toMatch(/holding live/i);
    expect(thesis.continuity_read).toMatch(/Jamal Murray|Aaron Gordon/i);
  });

  it('builds a DURING thesis when pressure is concentrating', () => {
    const thesis = buildThesis({
      stage: 'during',
      risk: buildRisk({
        level: 'fragile',
        pressureLabel: 'Fragile',
        primaryDriver: 'correlated_stack_pressure',
        headline: 'Correlated stack pressure is setting the live pressure.',
        detail: 'Too many legs still depend on the same player, game, or script.',
        evidence: [{ driver: 'correlated_stack_pressure', score: 54, tag: 'Correlated stack pressure' }]
      }),
      continuity: { strongest_leg_label: 'Jamal Murray', weakest_leg_label: 'Aaron Gordon' }
    });

    expect(thesis.thesis_status).toBe('under_pressure');
    expect(thesis.headline).toMatch(/under pressure live/i);
    expect(thesis.current_thesis).toMatch(/straining/i);
  });

  it('builds an AFTER thesis that resolved cleanly', () => {
    const thesis = buildThesis({ stage: 'after', risk: buildRisk({}), outcome: 'won' });

    expect(thesis.thesis_status).toBe('resolved_cleanly');
    expect(thesis.headline).toMatch(/resolved cleanly/i);
  });

  it('builds an AFTER thesis with a continuity-supported break', () => {
    const thesis = buildThesis({
      stage: 'after',
      risk: buildRisk({
        level: 'fragile',
        pressureLabel: 'Fragile',
        primaryDriver: 'late_game_dependency',
        carriedThrough: true,
        continuityTags: ['Settled review', 'Risk carried through'],
        headline: 'Late-game dependency carried through at settlement.',
        detail: 'Late-game dependency is still deciding too much.',
        evidence: [{ driver: 'late_game_dependency', score: 63, tag: 'Late-game dependency' }]
      }),
      continuity: { repeated_break_pattern: true, weakest_leg_label: 'Victor Wembanyama' },
      outcome: 'lost'
    });

    expect(thesis.thesis_status).toBe('broke');
    expect(thesis.continuity_read).toMatch(/carried through|matched/i);
  });

  it('builds an AFTER thesis for mixed push-heavy closes', () => {
    const thesis = buildThesis({
      stage: 'after',
      risk: buildRisk({
        level: 'watch',
        pressureLabel: 'Watch',
        primaryDriver: 'inflated_thresholds',
        headline: 'Inflated thresholds shaped the closing review.',
        detail: 'The slip depends on thresholds that are stretched relative to the rest of the build.',
        evidence: [{ driver: 'inflated_thresholds', score: 34, tag: 'Inflated thresholds' }]
      }),
      continuity: { mixed_outcome: true, push_void_heavy: true },
      outcome: 'partial'
    });

    expect(thesis.thesis_status).toBe('mixed_close');
    expect(thesis.subheadline).toMatch(/carry-through stays limited|did not support one clean/i);
  });
});
