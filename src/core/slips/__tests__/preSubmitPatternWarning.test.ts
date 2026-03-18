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
    expect(warning.suggested_fixes).toEqual([]);
  });

  it('generates aggressive ladder fixes and ranks the lower-threshold fix first', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'A', marketType: 'points', line: '31.5', odds: '+135', confidence: 0.52, game: 'A @ B' }),
        makeLeg({ id: '2', player: 'B', marketType: 'threes', line: '4.5', odds: '+150', confidence: 0.43, game: 'C @ D' }),
        makeLeg({ id: '3', player: 'C', marketType: 'assists', line: '10.5', odds: '+120', confidence: 0.61, game: 'E @ F' }),
        makeLeg({ id: '4', player: 'D', marketType: 'rebounds', line: '9.5', confidence: 0.74, game: 'G @ H' }),
        makeLeg({ id: '5', player: 'E', marketType: 'points', line: '18.5', confidence: 0.77, game: 'I @ J' })
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
      expect.arrayContaining([expect.objectContaining({ tag: 'line_too_aggressive' })])
    );
    expect(warning.recommendation_summary).toMatch(/aggressive ladders/i);
    expect(warning.recommendation_summary).toMatch(/3 similar threshold legs/i);
    expect(warning.suggested_fixes.map((fix) => fix.fix_type)).toEqual([
      'lower_threshold',
      'trim_leg_count'
    ]);
    expect(warning.suggested_fixes[0]).toMatchObject({
      fix_type: 'lower_threshold',
      confidence_level: 'medium',
      affected_legs: ['2', '1']
    });
  });

  it('generates correlated-stack fixes from same-script exposure', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'Jayson Tatum', marketType: 'points', confidence: 0.51, game: 'LAL @ BOS' }),
        makeLeg({ id: '2', player: 'Jayson Tatum', marketType: 'rebounds', confidence: 0.42, game: 'LAL @ BOS' }),
        makeLeg({ id: '3', player: 'Jaylen Brown', marketType: 'points', confidence: 0.47, game: 'LAL @ BOS' })
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
    expect(warning.suggested_fixes.map((fix) => fix.fix_type)).toEqual([
      'reduce_correlation',
      'swap_stat_type'
    ]);
    expect(warning.suggested_fixes[0]?.suggested_action).toMatch(/different game or player role/i);
  });

  it('generates blowout-risk fixes only when current slip carries supported script signals', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({
          id: '1',
          player: 'Tyrese Haliburton',
          marketType: 'points',
          line: '24.5',
          confidence: 0.48,
          game: 'IND @ CHA',
          deadLegRisk: 'high',
          deadLegReasons: ['blowout risk', 'minutes could dip in a mismatch']
        }),
        makeLeg({
          id: '2',
          player: 'Buddy Hield',
          marketType: 'threes',
          line: '3.5',
          confidence: 0.41,
          game: 'IND @ CHA',
          deadLegRisk: 'med',
          deadLegReasons: ['mismatch pressure']
        }),
        makeLeg({ id: '3', player: 'Myles Turner', marketType: 'rebounds', confidence: 0.66, game: 'IND @ CHA' })
      ],
      patternSummary: makePatternSummary({
        recurring_tags: [{ tag: 'blowout_minutes_risk', count: 3, percentage: 0.75 }],
        common_failure_mode: 'blowout_sensitive_scoring',
        sample_size: 4,
        confidence_level: 'medium'
      })
    });

    expect(warning.matched_patterns).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag: 'blowout_minutes_risk' })])
    );
    expect(warning.recommendation_summary).toMatch(/stable minutes/i);
    expect(warning.recommendation_summary).toMatch(/2 legs with blowout-style script risk/i);
    expect(warning.suggested_fixes.map((fix) => fix.fix_type)).toEqual([
      'reduce_blowout_exposure',
      'swap_stat_type'
    ]);
  });

  it('caps suggested fixes at three highest-signal options when multiple patterns match', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'Jayson Tatum', marketType: 'points', line: '32.5', odds: '+145', confidence: 0.52, game: 'LAL @ BOS', deadLegRisk: 'high', deadLegReasons: ['blowout risk'] }),
        makeLeg({ id: '2', player: 'Jayson Tatum', marketType: 'assists', line: '10.5', odds: '+125', confidence: 0.44, game: 'LAL @ BOS' }),
        makeLeg({ id: '3', player: 'Jaylen Brown', marketType: 'points', line: '29.5', odds: '+130', confidence: 0.41, game: 'LAL @ BOS' }),
        makeLeg({ id: '4', player: 'Derrick White', marketType: 'threes', line: '4.5', odds: '+155', confidence: 0.38, game: 'LAL @ BOS', deadLegRisk: 'med', deadLegReasons: ['mismatch pressure'] }),
        makeLeg({ id: '5', player: 'Aaron Gordon', marketType: 'rebounds', line: '7.5', confidence: 0.73, game: 'DEN @ PHX' })
      ],
      patternSummary: makePatternSummary({
        recurring_tags: [
          { tag: 'line_too_aggressive', count: 4, percentage: 0.67 },
          { tag: 'correlated_legs', count: 4, percentage: 0.67 },
          { tag: 'blowout_minutes_risk', count: 3, percentage: 0.5 }
        ],
        common_failure_mode: 'mixed_repeated_misses',
        sample_size: 7,
        confidence_level: 'high'
      })
    });

    expect(warning.warning_level).toBe('high');
    expect(warning.suggested_fixes).toHaveLength(3);
    expect(warning.suggested_fixes.map((fix) => fix.fix_type)).toEqual([
      'lower_threshold',
      'reduce_blowout_exposure',
      'reduce_correlation'
    ]);
  });

  it('keeps truthful low-confidence fix messaging when history is still limited', () => {
    const warning = buildPreSubmitPatternWarning({
      slip: [
        makeLeg({ id: '1', player: 'A', marketType: 'points', line: '31.5', odds: '+135', confidence: 0.45, game: 'A @ B' }),
        makeLeg({ id: '2', player: 'B', marketType: 'assists', line: '10.5', odds: '+120', confidence: 0.49, game: 'C @ D' })
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
    expect(warning.suggested_fixes[0]).toMatchObject({
      fix_type: 'lower_threshold',
      confidence_level: 'low'
    });
    expect(warning.suggested_fixes[0]?.explanation).toMatch(/sample is still thin/i);
  });
});
