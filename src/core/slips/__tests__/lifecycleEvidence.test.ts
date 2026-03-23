import { describe, expect, it } from 'vitest';

import { deriveLifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import { deriveLifecycleEvidence } from '@/src/core/slips/lifecycleEvidence';
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
    evidence: [{ driver: 'balanced_build', score: 12, tag: 'Balanced build' }],
    ...overrides
  };
}

describe('lifecycleEvidence', () => {
  it('builds clear stable evidence when the ticket stays balanced', () => {
    const risk = buildRisk();
    const guidance = deriveLifecycleActionGuidance({ risk, stage: 'before' });
    const evidence = deriveLifecycleEvidence({ risk, guidance, stage: 'before' });

    expect(evidence.primary_evidence.label).toMatch(/balanced build/i);
    expect(evidence.evidence_strength).toBe('clear');
    expect(evidence.secondary_evidence).toBeNull();
  });

  it('keeps one dominant driver when high pressure is concentrated', () => {
    const risk = buildRisk({
      level: 'high-pressure',
      pressureLabel: 'High pressure',
      primaryDriver: 'correlated_stack_pressure',
      secondaryDriver: 'volatile_secondary_stats',
      evidence: [
        { driver: 'correlated_stack_pressure', score: 78, tag: 'Correlated stack pressure' },
        { driver: 'volatile_secondary_stats', score: 44, tag: 'Volatile secondary stats' }
      ]
    });
    const guidance = deriveLifecycleActionGuidance({ risk, stage: 'during' });
    const evidence = deriveLifecycleEvidence({
      risk,
      guidance,
      stage: 'during',
      continuity: { weakest_leg_label: 'Aaron Gordon' }
    });

    expect(evidence.primary_evidence.label).toMatch(/correlated scoring dependency/i);
    expect(evidence.secondary_evidence?.label).toMatch(/secondary-stat volatility/i);
    expect(evidence.evidence_strength).toBe('strong');
  });

  it('falls back to thin-evidence notes when support is weak', () => {
    const risk = buildRisk({
      primaryDriver: 'low_evidence',
      reliability: 'low',
      continuityTags: ['Thin history'],
      evidence: [{ driver: 'low_evidence', score: 30, tag: 'Low evidence' }]
    });
    const guidance = deriveLifecycleActionGuidance({ risk, stage: 'before' });
    const evidence = deriveLifecycleEvidence({ risk, guidance, stage: 'before' });

    expect(evidence.evidence_strength).toBe('thin');
    expect(evidence.reliability_note).toMatch(/thin support/i);
  });

  it('makes carry-through explicit when continuity is preserved', () => {
    const risk = buildRisk({
      level: 'fragile',
      pressureLabel: 'Fragile',
      primaryDriver: 'late_game_dependency',
      carriedThrough: true,
      continuityTags: ['Settled review', 'Risk carried through'],
      evidence: [{ driver: 'late_game_dependency', score: 70, tag: 'Late-game dependency' }]
    });
    const guidance = deriveLifecycleActionGuidance({ risk, stage: 'after', outcome: 'lost' });
    const evidence = deriveLifecycleEvidence({ risk, guidance, stage: 'after' });

    expect(evidence.continuity_evidence).toMatch(/carried through/i);
    expect(evidence.evidence_strength).toBe('strong');
  });

  it('chooses a primary explainer even when weaker evidence conflicts', () => {
    const risk = buildRisk({
      level: 'watch',
      pressureLabel: 'Watch',
      primaryDriver: 'inflated_thresholds',
      secondaryDriver: 'role_mismatch',
      reliability: 'medium',
      evidence: [
        { driver: 'inflated_thresholds', score: 42, tag: 'Inflated thresholds' },
        { driver: 'role_mismatch', score: 35, tag: 'Role mismatch' }
      ]
    });
    const guidance = deriveLifecycleActionGuidance({ risk, stage: 'before' });
    const evidence = deriveLifecycleEvidence({ risk, guidance, stage: 'before' });

    expect(evidence.primary_evidence.key).toBe('inflated_thresholds');
    expect(evidence.evidence_strength).toBe('mixed');
  });

  it('stays conservative on ambiguous push-void-heavy closes', () => {
    const risk = buildRisk({
      level: 'stable',
      primaryDriver: 'balanced_build',
      reliability: 'medium',
      continuityTags: ['Settled review'],
      evidence: [{ driver: 'balanced_build', score: 12, tag: 'Balanced build' }]
    });
    const guidance = deriveLifecycleActionGuidance({ risk, stage: 'after', outcome: 'partial' });
    const evidence = deriveLifecycleEvidence({
      risk,
      guidance,
      stage: 'after',
      continuity: { push_void_heavy: true, mixed_outcome: true }
    });

    expect(evidence.secondary_evidence?.key).toBe('push_void_heavy_close');
    expect(evidence.continuity_evidence).toMatch(/push\/void heavy/i);
  });
});
