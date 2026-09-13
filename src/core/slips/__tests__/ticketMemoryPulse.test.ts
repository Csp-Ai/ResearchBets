import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { BettorMistakePatternSummary } from '@/src/core/postmortem/patterns';
import { deriveTicketMemoryPulse } from '@/src/core/slips/ticketMemoryPulse';

const summary = (
  overrides: Partial<BettorMistakePatternSummary> = {},
): BettorMistakePatternSummary => ({
  recurring_tags: overrides.recurring_tags ?? [],
  common_failure_mode: overrides.common_failure_mode ?? 'insufficient_history',
  sample_size: overrides.sample_size ?? 0,
  confidence_level: overrides.confidence_level ?? 'low',
  recommendation_summary:
    overrides.recommendation_summary ?? 'No reviewed slip history yet.',
  recent_examples: overrides.recent_examples ?? [],
});

const leg = (overrides: Partial<SlipBuilderLeg> = {}): SlipBuilderLeg => ({
  id: overrides.id ?? 'leg-1',
  player: overrides.player ?? 'Player One',
  marketType: overrides.marketType ?? 'receiving_yards',
  line: overrides.line ?? '40+ receiving yards',
  odds: overrides.odds ?? '-300',
  game: overrides.game ?? 'AAA @ BBB',
  confidence: overrides.confidence,
  volatility: overrides.volatility,
  deadLegRisk: overrides.deadLegRisk,
  deadLegReasons: overrides.deadLegReasons,
});

describe('deriveTicketMemoryPulse', () => {
  it('stays truthful while memory has no reviewed history', () => {
    const pulse = deriveTicketMemoryPulse({
      slip: [leg()],
      patternSummary: summary(),
    });

    expect(pulse.level).toBe('learning');
    expect(pulse.sample_size).toBe(0);
    expect(pulse.matches).toEqual([]);
    expect(pulse.headline).toMatch(/learning/i);
  });

  it('extends aggressive-threshold memory to NFL yardage ladders', () => {
    const pulse = deriveTicketMemoryPulse({
      slip: [
        leg({ id: 'pass', player: 'QB One', marketType: 'passing_yards', line: '275+ pass yards', odds: '+105' }),
        leg({ id: 'recv', player: 'WR One', marketType: 'receiving_yards', line: '80+ receiving yards', odds: '-110', game: 'CCC @ DDD' }),
      ],
      patternSummary: summary({
        recurring_tags: [{ tag: 'line_too_aggressive', count: 3, percentage: 0.6 }],
        common_failure_mode: 'aggressive_line_selection',
        sample_size: 5,
        confidence_level: 'medium',
      }),
    });

    expect(pulse.matches.map((match) => match.key)).toContain('nfl_aggressive_threshold');
    expect(pulse.affected_leg_ids).toEqual(expect.arrayContaining(['pass', 'recv']));
    expect(pulse.fixes.some((fix) => /step down/i.test(fix.title))).toBe(true);
  });

  it('finds NFL same-script exposure when correlation is a repeated bettor pattern', () => {
    const pulse = deriveTicketMemoryPulse({
      slip: [
        leg({ id: 'a', player: 'QB One', marketType: 'passing_yards', line: '225+ pass yards', game: 'AAA @ BBB' }),
        leg({ id: 'b', player: 'WR One', marketType: 'receiving_yards', line: '50+ receiving yards', game: 'AAA @ BBB' }),
        leg({ id: 'c', player: 'RB Two', marketType: 'rushing_yards', line: '50+ rush yards', game: 'CCC @ DDD' }),
      ],
      patternSummary: summary({
        recurring_tags: [{ tag: 'correlated_legs', count: 4, percentage: 0.67 }],
        common_failure_mode: 'correlated_same_script_exposure',
        sample_size: 6,
        confidence_level: 'high',
      }),
    });

    expect(pulse.matches.some((match) => match.key === 'correlated_legs' || match.key === 'nfl_same_script')).toBe(true);
    expect(pulse.level).not.toBe('clear');
  });

  it('surfaces touchdown dependency when reviewed history shows variance pressure', () => {
    const pulse = deriveTicketMemoryPulse({
      slip: [
        leg({ id: 'td', player: 'RB One', marketType: 'anytime_td', line: 'Anytime TD', odds: '+120' }),
        leg({ id: 'volume', player: 'WR Two', marketType: 'receiving_yards', line: '40+ receiving yards', game: 'CCC @ DDD' }),
      ],
      patternSummary: summary({
        recurring_tags: [{ tag: 'efficiency_variance', count: 3, percentage: 0.5 }],
        common_failure_mode: 'high_variance_stat_chasing',
        sample_size: 6,
        confidence_level: 'medium',
      }),
    });

    expect(pulse.matches.map((match) => match.key)).toContain('nfl_binary_scoring');
    expect(pulse.fixes.some((fix) => /volume/i.test(fix.title))).toBe(true);
  });
});
