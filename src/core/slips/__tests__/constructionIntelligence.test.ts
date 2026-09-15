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
  marketImpliedProb: overrides.marketImpliedProb,
  consensusPrice: overrides.consensusPrice,
  recentForm: overrides.recentForm,
  adjacentAlt: overrides.adjacentAlt,
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

  it('computes threshold tax only from a real adjacent lower tier', () => {
    const result = classifyConstructionLeg(
      leg({
        marketType: 'receiving_yards',
        line: '60+ receiving yards',
        odds: '-210',
        marketImpliedProb: 0.68,
        consensusPrice: '-213',
        adjacentAlt: {
          line: 50,
          bestPrice: '-300',
          consensusPrice: '-317',
          marketImpliedProb: 0.76,
          sourceCount: 4,
        },
      }),
    );

    expect(result.thresholdTax).not.toBeNull();
    expect(result.thresholdTax?.lineReduction).toBe(10);
    expect(result.thresholdTax?.probabilityGain).toBeCloseTo(0.08);
    expect(result.thresholdTax?.lowerConsensusPrice).toBe('-317');
    expect(result.suggestedTarget).toBe('50 at -300');
  });

  it('labels weak exact-threshold history as recent-form tension', () => {
    const result = classifyConstructionLeg(
      leg({
        marketType: 'receiving_yards',
        line: '80+ receiving yards',
        odds: '+105',
        recentForm: {
          l5HitRate: 0.2,
          l10HitRate: 0.4,
          l5Hits: 1,
          l5Games: 5,
          l10Hits: 4,
          l10Games: 10,
          recentAverage: 61.3,
          sampleSize: 10,
          season: '2026',
          asOf: '2026-09-13T00:00:00.000Z',
          source: 'SportsDataIO',
        },
      }),
    );

    expect(result.tier).toBe('pushed');
    expect(result.recentForm?.status).toBe('tension');
    expect(result.recentForm?.l5Hits).toBe(1);
  });

  it('keeps strong exact-threshold history as support rather than a prediction', () => {
    const result = classifyConstructionLeg(
      leg({
        marketType: 'receiving_yards',
        line: '60+ receiving yards',
        odds: '-180',
        recentForm: {
          l5HitRate: 0.8,
          l10HitRate: 0.7,
          l5Hits: 4,
          l5Games: 5,
          l10Hits: 7,
          l10Games: 10,
          recentAverage: 74.2,
          sampleSize: 10,
          season: '2026',
          asOf: '2026-09-13T00:00:00.000Z',
          source: 'SportsDataIO',
        },
      }),
    );

    expect(result.recentForm?.status).toBe('support');
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

  it('prioritizes a pushed leg with verified recent-form tension for repair', () => {
    const weakRecentForm = {
      l5HitRate: 0.2,
      l10HitRate: 0.4,
      l5Hits: 1,
      l5Games: 5,
      l10Hits: 4,
      l10Games: 10,
      recentAverage: 51,
      sampleSize: 10,
      season: '2026',
      asOf: '2026-09-13T00:00:00.000Z',
      source: 'SportsDataIO' as const,
    };

    const report = buildConstructionReport([
      leg({ id: 'one', player: 'Player One', marketType: 'anytime_td', line: 'Anytime TD', odds: '+120' }),
      leg({ id: 'two', player: 'Player Two', marketType: 'receiving_yards', line: '80+ receiving yards', odds: '+105', recentForm: weakRecentForm }),
    ]);

    expect(report.formTensionCount).toBe(1);
    expect(report.repairCandidates[0]?.legId).toBe('two');
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
