import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { buildPreSubmitPatternWarning } from '@/src/core/slips/preSubmitPatternWarning';
import type { BettorMistakePatternSummary } from '@/src/core/postmortem/patterns';

function makePatternSummary(
  overrides: Partial<BettorMistakePatternSummary> = {}
): BettorMistakePatternSummary {
  return {
    recurring_tags: overrides.recurring_tags ?? [],
    common_failure_mode: overrides.common_failure_mode ?? 'insufficient_history',
    sample_size: overrides.sample_size ?? 0,
    confidence_level: overrides.confidence_level ?? 'low',
    recommendation_summary:
      overrides.recommendation_summary ?? 'No reviewed slip history yet, so no bettor pattern summary is available.',
    recent_examples: overrides.recent_examples ?? []
  };
}

function makeLeg(overrides: Partial<SlipBuilderLeg> = {}): SlipBuilderLeg {
  return {
    id: overrides.id ?? 'leg-1',
    player: overrides.player ?? 'Player A',
    marketType: overrides.marketType ?? 'points',
    line: overrides.line ?? '22.5',
    odds: overrides.odds,
    confidence: overrides.confidence,
    volatility: overrides.volatility,
    game: overrides.game ?? 'LAL @ BOS',
    deadLegRisk: overrides.deadLegRisk,
    deadLegReasons: overrides.deadLegReasons
  };
}

describe('buildPreSubmitPatternWarning', () => {
  it('suppresses warnings with no reviewed history', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [makeLeg()],
      patternSummary: makePatternSummary()
    });

    expect(warning.warning_level).toBe('none');
    expect(warning.suppression_reason).toBe('no_reviewed_history');
    expect(warning.recommendation_summary).toMatch(/no reviewed slip history yet/i);
  });

  it('matches repeated aggressive line patterns against multiple ladder legs', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'A', marketType: 'points', line: '31.5', odds: '+135', game: 'A @ B' }),
        makeLeg({ id: '2', player: 'B', marketType: 'threes', line: '4.5', odds: '+125', game: 'C @ D' }),
        makeLeg({ id: '3', player: 'C', marketType: 'rebounds', line: '9.5', game: 'E @ F' })
      ],
      patternSummary: makePatternSummary({
        recurring_tags: [{ tag: 'line_too_aggressive', count: 3, percentage: 0.6 }],
        common_failure_mode: 'aggressive_line_selection',
        sample_size: 5,
        confidence_level: 'medium'
      })
    });

    expect(warning.warning_level).toBe('medium');
    expect(warning.matched_patterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'line_too_aggressive' })
      ])
    );
    expect(warning.recommendation_summary).toMatch(/aggressive ladders/i);
    expect(warning.recommendation_summary).toMatch(/2 similar threshold legs/i);
  });

  it('matches repeated correlated-leg patterns against one-script stacks', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'Jayson Tatum', marketType: 'points', game: 'LAL @ BOS' }),
        makeLeg({ id: '2', player: 'Jayson Tatum', marketType: 'rebounds', game: 'LAL @ BOS' }),
        makeLeg({ id: '3', player: 'Jaylen Brown', marketType: 'points', game: 'LAL @ BOS' })
      ],
      patternSummary: makePatternSummary({
        recurring_tags: [{ tag: 'correlated_legs', count: 4, percentage: 0.67 }],
        common_failure_mode: 'correlated_same_script_exposure',
        sample_size: 6,
        confidence_level: 'high'
      })
    });

    expect(warning.warning_level).toBe('medium');
    expect(warning.matched_patterns[0]?.tag).toBe('correlated_legs');
    expect(warning.recommendation_summary).toMatch(/correlated stacks/i);
    expect(warning.recommendation_summary).toMatch(/3 legs tied/i);
  });

  it('matches blowout-minute patterns only when current slip carries supported script signals', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({
          id: '1',
          player: 'Tyrese Haliburton',
          marketType: 'points',
          line: '24.5',
          game: 'IND @ CHA',
          deadLegRisk: 'high',
          deadLegReasons: ['blowout risk', 'minutes could dip in a mismatch']
        }),
        makeLeg({ id: '2', player: 'Myles Turner', marketType: 'rebounds', game: 'IND @ CHA' })
      ],
      patternSummary: makePatternSummary({
        recurring_tags: [{ tag: 'blowout_minutes_risk', count: 3, percentage: 0.75 }],
        common_failure_mode: 'blowout_sensitive_scoring',
        sample_size: 4,
        confidence_level: 'medium'
      })
    });

    expect(warning.matched_patterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'blowout_minutes_risk' })
      ])
    );
    expect(warning.recommendation_summary).toMatch(/stable minutes/i);
    expect(warning.recommendation_summary).toMatch(/1 leg with blowout-style script risk/i);
  });

  it('keeps truthful low-confidence messaging when history is still limited', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'A', marketType: 'points', line: '31.5', odds: '+135', game: 'A @ B' }),
        makeLeg({ id: '2', player: 'B', marketType: 'assists', line: '10.5', odds: '+120', game: 'C @ D' })
      ],
      patternSummary: makePatternSummary({
        recurring_tags: [{ tag: 'line_too_aggressive', count: 2, percentage: 1 }],
        common_failure_mode: 'aggressive_line_selection',
        sample_size: 2,
        confidence_level: 'low'
      })
    });

    expect(warning.warning_level).toBe('low');
    expect(warning.recommendation_summary).toMatch(/limited history: this warning is low-confidence/i);
  });
});
