import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { buildConstructionReport } from '@/src/core/slips/constructionIntelligence';

const leg = (overrides: Partial<SlipBuilderLeg> = {}): SlipBuilderLeg => ({
  id: overrides.id ?? 'leg-1',
  player: overrides.player ?? 'Player One',
  marketType: overrides.marketType ?? 'receiving_yards',
  line: overrides.line ?? '40+ receiving yards',
  odds: overrides.odds ?? '-350',
  game: overrides.game ?? 'AAA @ BBB',
  marketImpliedProb: overrides.marketImpliedProb ?? 0.78,
  consensusPrice: overrides.consensusPrice ?? '-350',
  recentForm: overrides.recentForm,
  adjacentAlt: overrides.adjacentAlt,
  adjacentUpperAlt: overrides.adjacentUpperAlt,
});

describe('construction threshold optimization', () => {
  it('surfaces one efficient escalation when the ticket still has push budget', () => {
    const report = buildConstructionReport([
      leg({
        id: 'harvey',
        player: 'RJ Harvey',
        line: '10+ receiving yards',
        marketImpliedProb: 0.79,
        adjacentUpperAlt: {
          line: 15,
          bestPrice: '-300',
          consensusPrice: '-285',
          marketImpliedProb: 0.73,
          sourceCount: 4,
        },
      }),
      leg({ id: 'sutton', player: 'Courtland Sutton', marketType: 'receptions', line: '3+ receptions', marketImpliedProb: 0.80 }),
      leg({ id: 'rice', player: 'Rashee Rice', marketType: 'receptions', line: '4+ receptions', marketImpliedProb: 0.77 }),
      leg({ id: 'kelce', player: 'Travis Kelce', marketType: 'receptions', line: '4+ receptions', marketImpliedProb: 0.74 }),
    ]);

    expect(report.status).toBe('balanced');
    expect(report.budgetRemaining).toBe(1);
    expect(report.escalationCandidates[0]?.legId).toBe('harvey');
    expect(report.escalationCandidates[0]?.thresholdOptimization.decision).toBe('step_up');
  });

  it('does not recommend an escalation after the push budget is fully allocated', () => {
    const report = buildConstructionReport([
      leg({
        id: 'harvey',
        player: 'RJ Harvey',
        line: '10+ receiving yards',
        marketImpliedProb: 0.79,
        adjacentUpperAlt: {
          line: 15,
          bestPrice: '-300',
          consensusPrice: '-285',
          marketImpliedProb: 0.73,
          sourceCount: 4,
        },
      }),
      leg({ id: 'pushed', player: 'Pushed Player', line: '80+ receiving yards', odds: '+105', marketImpliedProb: 0.49 }),
      leg({ id: 'rice', player: 'Rashee Rice', marketType: 'receptions', line: '4+ receptions', marketImpliedProb: 0.77 }),
      leg({ id: 'kelce', player: 'Travis Kelce', marketType: 'receptions', line: '4+ receptions', marketImpliedProb: 0.74 }),
    ]);

    expect(report.status).toBe('watch');
    expect(report.budgetRemaining).toBe(0);
    expect(report.escalationCandidates).toHaveLength(0);
  });

  it('keeps a costly higher tier visible but refuses to recommend it', () => {
    const report = buildConstructionReport([
      leg({
        id: 'walker',
        player: 'Kenneth Walker',
        line: '70+ rushing + receiving yards',
        marketImpliedProb: 0.74,
        adjacentUpperAlt: {
          line: 80,
          bestPrice: '-180',
          consensusPrice: '-175',
          marketImpliedProb: 0.64,
          sourceCount: 5,
        },
      }),
      leg({ id: 'sutton', player: 'Courtland Sutton', marketType: 'receptions', line: '3+ receptions', marketImpliedProb: 0.80 }),
    ]);

    const walker = report.legs.find((row) => row.legId === 'walker');
    expect(walker?.thresholdOptimization.stepUp).not.toBeNull();
    expect(walker?.thresholdOptimization.decision).toBe('hold');
    expect(report.escalationCandidates).toHaveLength(0);
  });
});
