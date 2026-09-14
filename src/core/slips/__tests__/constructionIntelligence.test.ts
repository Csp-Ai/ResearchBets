import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  buildConstructionReport,
  classifyConstructionLeg,
} from '@/src/core/slips/constructionIntelligence';

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

describe('construction intelligence', () => {
  it('classifies strongly priced lower alternate lines as floor-oriented', () => {
    const result = classifyConstructionLeg(
      leg({ marketType: 'receiving_yards', line: '40+ receiving yards', odds: '-350' }),
    );

    expect(result.tier).toBe('floor');
    expect(result.impliedProbability).toBeGreaterThan(0.75);
  });

  it('treats touchdown events as pushed even when the player read is reasonable', () => {
    const result = classifyConstructionLeg(
      leg({ marketType: 'anytime_td', line: 'Anytime TD', odds: '-105' }),
    );

    expect(result.tier).toBe('pushed');
    expect(result.reason).toMatch(/binary scoring event/i);
  });

  it('applies a time-window tax to first-quarter props', () => {
    const result = classifyConstructionLeg(
      leg({
        marketType: 'receiving_yards',
        line: '5+ receiving yards 1Q',
        odds: '-500',
      }),
    );

    expect(result.tier).toBe('pushed');
    expect(result.shortWindow).toBe(true);
    expect(result.suggestedTarget).toMatch(/full-game/i);
  });

  it('allows two pushed thresholds on an eight-to-ten leg construction before overload', () => {
    const slip = [
      leg({ id: '1', player: 'A', line: '40+ receiving yards', odds: '-320' }),
      leg({ id: '2', player: 'B', marketType: 'rushing_yards', line: '40+ rushing yards', odds: '-300' }),
      leg({ id: '3', player: 'C', marketType: 'passing_yards', line: '200+ passing yards', odds: '-280' }),
      leg({ id: '4', player: 'D', marketType: 'receptions', line: '3+ receptions', odds: '-300' }),
      leg({ id: '5', player: 'E', marketType: 'receiving_yards', line: '50+ receiving yards', odds: '-220' }),
      leg({ id: '6', player: 'F', marketType: 'rushing_yards', line: '50+ rushing yards', odds: '-210' }),
      leg({ id: '7', player: 'G', marketType: 'receiving_yards', line: '80+ receiving yards', odds: '+105' }),
      leg({ id: '8', player: 'H', marketType: 'anytime_td', line: 'Anytime TD', odds: '+120' }),
      leg({ id: '9', player: 'I', marketType: 'receptions', line: '4+ receptions', odds: '-220' }),
      leg({ id: '10', player: 'J', marketType: 'passing_yards', line: '225+ passing yards', odds: '-220' }),
    ];

    const report = buildConstructionReport(slip);

    expect(report.pushBudget).toBe(2);
    expect(report.pushedCount).toBe(2);
    expect(report.status).toBe('watch');
  });

  it('flags an overloaded long parlay when pushed thresholds exceed budget', () => {
    const slip = Array.from({ length: 8 }, (_, index) =>
      leg({
        id: String(index + 1),
        player: `Player ${index + 1}`,
        marketType: index < 3 ? 'anytime_td' : 'receiving_yards',
        line: index < 3 ? 'Anytime TD' : '40+ receiving yards',
        odds: index < 3 ? '+115' : '-300',
        game: `GAME ${index + 1}`,
      }),
    );

    const report = buildConstructionReport(slip);

    expect(report.pushBudget).toBe(2);
    expect(report.pushedCount).toBe(3);
    expect(report.status).toBe('overloaded');
    expect(report.repairCandidates).toHaveLength(3);
    expect(report.summary).toMatch(/lower or remove 1 pushed leg/i);
  });
});
