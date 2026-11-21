import { describe, expect, it } from 'vitest';
import type { TrackedTicketLeg } from '@/src/core/track/types';
import { inspectScreenshotTicket } from '../screenshotTicketMetadata';
import { summarizeScreenshotPreflight } from '../screenshotPreflight';

const exampleLeg = (i: number): TrackedTicketLeg => ({
  legId: String(i), league: 'NBA', player: 'Test Player ' + i,
  marketType: 'moneyline', threshold: 0, direction: 'over',
  odds: undefined, source:'screenshot',parseConfidence:'low'
});

describe('conservative screenshot preflight', () => {
  it('names the missing number of contracts before any risk claim', () => {
    const meta = inspectScreenshotTicket('Kalshi\n10 MARKET COMBO\nCOST $12.40\nMAX PAYOUT $1,234.56');
    const brief = summarizeScreenshotPreflight(meta, Array.from({length:4}, (_,i)=>exampleLeg(i)));
    expect(brief.title).toBe('4 of 10 visible selections');
    expect(brief.primaryPressure).toMatch(/4 of 10 selections recognized/i);
    expect(brief.readyForCanonicalXRay).toBe(false);
  });
  it('never recommends converting Kalshi contract percentages to conventional parlay odds', () => {
    const meta = inspectScreenshotTicket('Kalshi\n4 MARKET COMBO\nTest Team to win 72%');
    const brief = summarizeScreenshotPreflight(meta, Array.from({length:4},(_,i)=>exampleLeg(i)));
    expect(brief.primaryPressure).toMatch(/quotes.*not American prices/i);
    expect(brief.readyForCanonicalXRay).toBe(false);
  });
  it('keeps closed positions out of outcome memory without verified results', () => {
    const meta = inspectScreenshotTicket('Kalshi\nPOSITION CLOSED\n3 MARKET COMBO');
    const brief = summarizeScreenshotPreflight(meta, Array.from({length:3},(_,i)=>exampleLeg(i)));
    expect(brief.read).toMatch(/closed is not the same as won/i);
    expect(brief.nextAction).toMatch(/official results/i);
  });
  it('recognizes unsupported fantasy projections as a review problem', () => {
    const meta = inspectScreenshotTicket('PrizePicks lineup\nNate Sheppard ↑ 25.5 Fantasy Score');
    const legs = [{...exampleLeg(1), unsupportedMarket: true}];
    const brief = summarizeScreenshotPreflight(meta, legs);
    expect(brief.primaryPressure).toMatch(/different market/i);
    expect(brief.readyForCanonicalXRay).toBe(false);
  });
  it('identifies special SGP+ pricing as an explicit abstention', () => {
    const meta = inspectScreenshotTicket('11 Leg Same Game Parlay+ +11089');
    const brief = summarizeScreenshotPreflight(meta, Array.from({length:11},(_,i)=>exampleLeg(i)));
    expect(brief.primaryPressure).toMatch(/cannot be priced by multiplying individual/i);
    expect(brief.readyForCanonicalXRay).toBe(false);
  });
  it('passes conventional tickets to canonical analysis without asserting a winning probability', () => {
    const meta = inspectScreenshotTicket('FanDuel Sportsbook\nJayson Tatum over 27.5 points -110');
    const brief = summarizeScreenshotPreflight(meta, [{
      ...exampleLeg(1), player:'Jayson Tatum',marketType:'points',threshold:27.5,odds:'-110'
    }]);
    expect(brief.readyForCanonicalXRay).toBe(true);
    expect(brief.read).not.toMatch(/\d+%/);
  });
});
