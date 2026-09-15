import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  applyBuildThresholdMove,
  buildBuildThresholdAdvice,
  enrichBuildLegFromIdea,
  marketPointToDisplayedThreshold,
  type BuildThresholdIdea,
} from '@/src/core/slips/buildThresholdAdvisor';

const leg = (overrides: Partial<SlipBuilderLeg> = {}): SlipBuilderLeg => ({
  id: overrides.id ?? 'leg-1',
  player: overrides.player ?? 'Player One',
  marketType: overrides.marketType ?? 'receiving_yards',
  line: overrides.line ?? '50+ receiving yards',
  odds: overrides.odds ?? '-220',
  game: overrides.game ?? 'AAA @ BBB',
  marketImpliedProb: overrides.marketImpliedProb ?? 0.69,
  consensusPrice: overrides.consensusPrice ?? '-223',
  recentForm: overrides.recentForm,
  adjacentAlt: overrides.adjacentAlt,
  adjacentUpperAlt: overrides.adjacentUpperAlt,
});

const idea = (overrides: Partial<BuildThresholdIdea> = {}): BuildThresholdIdea => ({
  id: overrides.id ?? 'leg-1',
  player: overrides.player ?? 'Player One',
  marketType: overrides.marketType ?? 'receiving_yards',
  matchup: overrides.matchup ?? 'AAA @ BBB',
  line: overrides.line ?? 49.5,
  bestPrice: overrides.bestPrice ?? -220,
  consensusPrice: overrides.consensusPrice ?? -223,
  marketImpliedProb: overrides.marketImpliedProb ?? 0.69,
  sourceCount: overrides.sourceCount ?? 4,
  recentForm: overrides.recentForm,
  stepDown: overrides.stepDown,
  stepUp: overrides.stepUp,
});

describe('build threshold advisor', () => {
  it('normalizes half-point alternate markets to displayed plus thresholds', () => {
    expect(marketPointToDisplayedThreshold(49.5)).toBe(50);
    expect(marketPointToDisplayedThreshold(59.5)).toBe(60);
    expect(marketPointToDisplayedThreshold(60)).toBe(60);
  });

  it('enriches a selected build leg with verified lower and higher tiers', () => {
    const result = enrichBuildLegFromIdea(
      leg(),
      idea({
        stepDown: {
          line: 39.5,
          bestPrice: -330,
          consensusPrice: -340,
          marketImpliedProb: 0.77,
          sourceCount: 5,
        },
        stepUp: {
          line: 59.5,
          bestPrice: -165,
          consensusPrice: -170,
          marketImpliedProb: 0.63,
          sourceCount: 4,
        },
      }),
    );

    expect(result.adjacentAlt?.line).toBe(40);
    expect(result.adjacentUpperAlt?.line).toBe(60);
    expect(result.marketImpliedProb).toBeCloseTo(0.69);
  });

  it('offers a best safety move and a selective escalation when push budget remains', () => {
    const legs = [
      leg({
        id: 'safe',
        player: 'Safe Player',
        line: '50+ receiving yards',
        marketImpliedProb: 0.69,
        adjacentAlt: {
          line: 40,
          bestPrice: '-330',
          consensusPrice: '-340',
          marketImpliedProb: 0.77,
          sourceCount: 5,
        },
      }),
      leg({
        id: 'up',
        player: 'Up Player',
        marketType: 'receptions',
        line: '4+ receptions',
        odds: '-240',
        marketImpliedProb: 0.71,
        adjacentUpperAlt: {
          line: 5,
          bestPrice: '-175',
          consensusPrice: '-180',
          marketImpliedProb: 0.64,
          sourceCount: 4,
        },
      }),
      leg({
        id: 'anchor',
        player: 'Anchor Player',
        marketType: 'passing_yards',
        line: '200+ pass yards',
        odds: '-350',
        marketImpliedProb: 0.78,
      }),
    ];

    const advice = buildBuildThresholdAdvice(legs);

    expect(advice.safety).toMatchObject({ legId: 'safe', currentLine: 50, targetLine: 40 });
    expect(advice.safety?.after.priceStackProbability).toBeGreaterThan(
      advice.safety?.before.priceStackProbability ?? 0,
    );
    expect(advice.escalation).toMatchObject({ legId: 'up', currentLine: 4, targetLine: 5 });
    expect(advice.escalation?.after.priceStackProbability).toBeLessThan(
      advice.escalation?.before.priceStackProbability ?? 1,
    );
  });

  it('removes the escalation recommendation when push budget is already consumed', () => {
    const legs = [
      leg({ id: 'td', player: 'TD Player', marketType: 'anytime_td', line: 'Anytime TD', odds: '+120', marketImpliedProb: 0.45 }),
      leg({
        id: 'up',
        player: 'Up Player',
        marketType: 'receptions',
        line: '4+ receptions',
        marketImpliedProb: 0.71,
        adjacentUpperAlt: {
          line: 5,
          bestPrice: '-175',
          consensusPrice: '-180',
          marketImpliedProb: 0.64,
          sourceCount: 4,
        },
      }),
      leg({ id: 'anchor', player: 'Anchor', marketType: 'passing_yards', line: '200+ pass yards', marketImpliedProb: 0.78 }),
    ];

    const advice = buildBuildThresholdAdvice(legs);
    expect(advice.report.budgetRemaining).toBe(0);
    expect(advice.escalation).toBeNull();
  });

  it('applies a safety move without leaving stale lower-tier evidence attached', () => {
    const source = leg({
      adjacentAlt: {
        line: 40,
        bestPrice: '-330',
        consensusPrice: '-340',
        marketImpliedProb: 0.77,
        sourceCount: 5,
      },
    });
    const advice = buildBuildThresholdAdvice([source]);
    expect(advice.safety).not.toBeNull();

    const moved = applyBuildThresholdMove(source, advice.safety!);
    expect(moved.line).toBe('40+ receiving yards');
    expect(moved.adjacentAlt).toBeUndefined();
    expect(moved.adjacentUpperAlt?.line).toBe(50);
  });
});
