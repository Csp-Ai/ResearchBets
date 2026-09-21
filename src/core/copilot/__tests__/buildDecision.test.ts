import { describe, expect, it } from 'vitest';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  buildBuildCopilotRead,
  type BuildCopilotIntent,
} from '@/src/core/copilot/buildDecision';
import type { BuildThresholdIdea } from '@/src/core/slips/buildThresholdAdvisor';

const leg: SlipBuilderLeg = {
  id: 'leg-1',
  player: 'Receiver A',
  marketType: 'receiving_yards',
  line: '70+ receiving yards',
  odds: '-122',
  game: 'SEA @ ARI',
};

const idea: BuildThresholdIdea = {
  id: 'leg-1',
  player: 'Receiver A',
  marketType: 'receiving_yards',
  matchup: 'SEA @ ARI',
  line: 69.5,
  bestPrice: -122,
  consensusPrice: -125,
  marketImpliedProb: 0.55,
  sourceCount: 3,
  stepDown: {
    line: 59.5,
    bestPrice: -190,
    consensusPrice: -195,
    marketImpliedProb: 0.68,
    sourceCount: 3,
  },
  stepUp: {
    line: 79.5,
    bestPrice: 120,
    consensusPrice: 115,
    marketImpliedProb: 0.45,
    sourceCount: 3,
  },
};

const read = (
  intent: BuildCopilotIntent,
  marketState: 'live' | 'unavailable',
  ideas: BuildThresholdIdea[] = [idea],
) =>
  buildBuildCopilotRead({
    legs: [leg],
    ideas,
    intent,
    marketState,
  });

describe('Build Decision Copilot', () => {
  it('turns a verified alternate ladder into one concrete safety action', () => {
    const result = read('make_safer', 'live');

    expect(result.evidenceState).toBe('verified_market');
    expect(result.action.kind).toBe('apply_threshold');
    if (result.action.kind !== 'apply_threshold') throw new Error('expected threshold action');

    expect(result.action.move.legId).toBe('leg-1');
    expect(result.action.move.currentLine).toBe(70);
    expect(result.action.move.targetLine).toBe(60);
    expect(result.answer).toMatch(/sportsbook-implied probability/i);
  });

  it('fails closed when fresh market evidence is unavailable', () => {
    const result = read('make_safer', 'unavailable');

    expect(result.evidenceState).toBe('structural_only');
    expect(result.action.kind).toBe('xray');
    expect(result.optionalMove).toBeNull();
    expect(result.answer).toMatch(/should not recommend a threshold change/i);
  });

  it('does not force an escalation when the next tier is inefficient', () => {
    const result = read('selective_push', 'live');

    expect(result.action.kind).toBe('hold');
    expect(result.answer).toMatch(/No higher verified tier clears/i);
  });

  it('uses explanation mode to summarize ticket construction without pretending to predict a winner', () => {
    const result = read('explain_ticket', 'live');

    expect(result.headline.length).toBeGreaterThan(0);
    expect(result.answer).toContain('pushed-threshold');
    expect(result.evidence).toContain('Push budget: 1/1');
  });
});
