import { describe, expect, it } from 'vitest';

import {
  buildWeakestLegIdentity,
  canUseHighConfidencePlay,
  confidenceTierFromPct,
  correlationSeverityFromEdges,
  fragilityTierFromScore,
  labelForMode,
  normalizeRateLike
} from '@/src/core/decision/lifecycleDecision';

describe('lifecycleDecision', () => {
  it('normalizes hitRateL10 scales safely', () => {
    expect(normalizeRateLike(0.72).pct).toBe(72);
    expect(normalizeRateLike(72).pct).toBe(72);
    expect(normalizeRateLike(7).pct).toBe(7);
    expect(normalizeRateLike(undefined, 55)).toEqual({ pct: 55, source: 'fallback' });
    expect(normalizeRateLike(null, 55)).toEqual({ pct: 55, source: 'fallback' });
  });

  it('maps canonical confidence and fragility taxonomy bands', () => {
    expect(confidenceTierFromPct(71)).toBe('Strong');
    expect(confidenceTierFromPct(63)).toBe('Solid');
    expect(confidenceTierFromPct(53)).toBe('Thin');
    expect(confidenceTierFromPct(41)).toBe('Fragile');
    expect(fragilityTierFromScore(39)).toBe('Low');
    expect(fragilityTierFromScore(45)).toBe('Watch');
    expect(fragilityTierFromScore(60)).toBe('Fragile');
    expect(fragilityTierFromScore(77)).toBe('High-pressure');
  });

  it('weights structured correlation edges by coupling severity', () => {
    const severe = correlationSeverityFromEdges([
      { a_leg_id: 'a', b_leg_id: 'b', kind: 'same_player', severity: 'high', reason: 'r1' },
      { a_leg_id: 'a', b_leg_id: 'c', kind: 'same_team', severity: 'med', reason: 'r2' }
    ]);
    const watch = correlationSeverityFromEdges([
      { a_leg_id: 'a', b_leg_id: 'b', kind: 'same_game', severity: 'low', reason: 'r3' }
    ]);
    expect(severe.severity).toBe('severe');
    expect(watch.severity).toBe('watch');
    expect(severe.score).toBeGreaterThan(watch.score);
  });

  it('tracks weakest-leg continuity across lifecycle stages', () => {
    const pregame = buildWeakestLegIdentity({
      canonical_leg_id: 'leg-a',
      source_stage: 'board',
      stage_role: 'candidate'
    });
    const live = buildWeakestLegIdentity({
      canonical_leg_id: 'leg-a',
      source_stage: 'track',
      stage_role: 'pressure_point',
      previous_leg_id: pregame.canonical_leg_id
    });
    const settled = buildWeakestLegIdentity({
      canonical_leg_id: 'leg-b',
      source_stage: 'review',
      stage_role: 'breaking_leg',
      previous_leg_id: live.canonical_leg_id
    });
    expect(live.continuity_status).toBe('carried_forward');
    expect(settled.continuity_status).toBe('changed');
  });

  it('keeps predictive/observed/descriptive language truthful', () => {
    expect(
      labelForMode({
        mode: 'predictive',
        confidenceTier: 'Solid',
        fragilityTier: 'High-pressure',
        correlationSeverity: 'watch'
      })
    ).toContain('fragile');
    expect(
      labelForMode({
        mode: 'observed',
        confidenceTier: 'Strong',
        fragilityTier: 'Watch',
        correlationSeverity: 'watch'
      })
    ).toContain('pressure');
    expect(
      labelForMode({
        mode: 'descriptive',
        confidenceTier: 'Thin',
        fragilityTier: 'Fragile',
        correlationSeverity: 'elevated'
      })
    ).toContain('breaking');
  });

  it('gates assertive high-confidence copy with guardrails', () => {
    expect(
      canUseHighConfidencePlay({
        confidenceTier: 'Strong',
        fragilityTier: 'Low',
        correlationSeverity: 'none',
        sourceQuality: 'high'
      })
    ).toBe(true);
    expect(
      canUseHighConfidencePlay({
        confidenceTier: 'Strong',
        fragilityTier: 'High-pressure',
        correlationSeverity: 'elevated',
        sourceQuality: 'low'
      })
    ).toBe(false);
  });
});
