import { describe, expect, it } from 'vitest';
import { newReviewLeg, reviewTicketIssues, toReviewLeg, toReviewedDraftLegs } from '@/src/core/track/slipReview';
import { parseSlipTextToLegs } from '@/src/core/track/slipParser';

describe('user-confirmed ticket review', () => {
  it('requires a participant and an explicit manual fix for missing OCR fields', () => {
    const [raw] = parseSlipTextToLegs('OVER 5.5 ASSISTS -110', 'screenshot');
    const [leg] = [toReviewLeg(raw!)];
    expect(leg.player).toBe('');
    expect(reviewTicketIssues([leg]).some((issue) => issue.includes('player name'))).toBe(true);
    expect(() => toReviewedDraftLegs([leg], 'screenshot')).toThrow();
  });

  it('keeps unsupported moneyline markets out of the structural player-prop beta', () => {
    const [raw] = parseSlipTextToLegs('BYU NCAAF moneyline +120', 'paste');
    const [leg] = [toReviewLeg(raw!)];
    expect(leg.marketType).toBe('');
    expect(leg.league).toBe('Unknown');
    expect(reviewTicketIssues([leg]).length).toBeGreaterThan(0);
  });

  it('preserves user-confirmed fields and accurately labels source without claiming provider verification', () => {
    const [raw] = parseSlipTextToLegs('Justin Jefferson 60+ receiving yards -300 MIN @ GB', 'screenshot');
    const leg = toReviewLeg(raw!);
    expect(reviewTicketIssues([leg])).toEqual([]);
    const [draft] = toReviewedDraftLegs([leg], 'screenshot');
    expect(draft).toMatchObject({
      player: 'Justin Jefferson', marketType: 'receiving_yards', line: '60+',
      game: 'MIN @ GB', odds: '-300', importSource: 'screenshot', reviewState: 'reviewed',
    });
  });

  it('allows missing prices and games without inventing odds or correlations', () => {
    const leg = { ...newReviewLeg('manual-1'), league: 'NBA' as const, player: 'Jayson Tatum',
      marketType: 'threes' as const, threshold: 2, parseConfidence: 'medium' as const };
    expect(reviewTicketIssues([leg])).toEqual([]);
    expect(toReviewedDraftLegs([leg], 'paste')[0]).toMatchObject({
      odds: undefined, game: undefined, importSource: 'paste', reviewState: 'reviewed',
    });
  });

  it('stops a blank added leg and rejects mismatched market/league combinations', () => {
    expect(reviewTicketIssues([newReviewLeg('manual-2')]).length).toBeGreaterThan(0);
    const [raw] = parseSlipTextToLegs('Justin Jefferson 60+ receiving yards', 'paste');
    const leg = { ...toReviewLeg(raw!), league: 'NBA' as const };
    expect(reviewTicketIssues([leg]).some((issue) => issue.includes('supported market'))).toBe(true);
  });
});
