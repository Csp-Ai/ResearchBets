// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computeVerdict, runSlip } from '@/src/core/pipeline/runSlip';
import { runStore } from '@/src/core/run/store';

vi.mock('@/src/core/context/getRunContext', () => ({
  getRunContext: vi.fn(async () => ({
    asOf: '2025-01-01T12:00:00.000Z',
    items: [],
    coverage: { injuries: 'none', transactions: 'none', odds: 'none', schedule: 'none' },
    fallbackReason: 'No verified update from trusted sources.'
  }))
}));

describe('runSlip pipeline', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('produces a persisted run with legs and analysis', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/slips/submit')) {
        return new Response(JSON.stringify({ slip_id: '00000000-0000-0000-0000-000000000001' }), { status: 200 });
      }

      if (url.includes('/api/slips/extract')) {
        return new Response(JSON.stringify({ extracted_legs: [{ selection: 'Jayson Tatum over 29.5 points (-110)', market: 'points', odds: '-110' }] }), { status: 200 });
      }

      return new Response('{}', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const traceId = await runSlip('Jayson Tatum over 29.5 points (-110)');
    const run = await runStore.getRun(traceId);

    expect(fetchMock).toHaveBeenCalled();
    expect(run?.status).toBe('complete');
    expect(run?.extractedLegs.length).toBe(1);
    expect(run?.enrichedLegs[0]?.l5).toBeGreaterThan(0);
    expect(run?.analysis.confidencePct).toBeGreaterThan(0);
    expect(run?.trustedContext?.fallbackReason).toBe('No verified update from trusted sources.');
  });


  it('computeVerdict keeps weakest leg aligned with sorted risk and reason wording', () => {
    const extracted = [
      { id: 'a', selection: 'Leg A' },
      { id: 'b', selection: 'Leg B' },
      { id: 'c', selection: 'Leg C' }
    ];
    const enriched = [
      { extractedLegId: 'a', l5: 40, l10: 45, season: 44, vsOpp: 42, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] },
      { extractedLegId: 'b', l5: 60, l10: 62, season: 58, vsOpp: 57, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] },
      { extractedLegId: 'c', l5: 75, l10: 76, season: 73, vsOpp: 70, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] }
    ];

    const verdict = computeVerdict(enriched, extracted, { stats: 'fallback', injuries: 'fallback', odds: 'fallback' });

    expect(verdict.weakestLegId).toBe('a');
    expect(verdict.reasons[0]).toContain('Highest downside: Leg A');
    expect(verdict.reasons.join(' ')).toContain('No downside drivers flagged');
    expect(verdict.confidencePct).toBeLessThanOrEqual(65);
  });

  it('does not increase confidence from unverified-only context', () => {
    const extracted = [{ id: 'a', selection: 'Leg A' }];
    const enriched = [{ extractedLegId: 'a', l5: 95, l10: 95, season: 95, vsOpp: 95, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] }];
    const verdict = computeVerdict(enriched, extracted, { stats: 'live', injuries: 'live', odds: 'live' }, 'none', [{ kind: 'injury', headline: 'unverified 1' }, { kind: 'injury', headline: 'unverified 2' }]);
    expect(verdict.confidencePct).toBeLessThanOrEqual(72);
    expect(verdict.dataQuality?.hasUnverified).toBe(true);
  });

  it('caps confidence when trusted injury coverage is none', () => {
    const extracted = [{ id: 'a', selection: 'Leg A' }];
    const enriched = [{ extractedLegId: 'a', l5: 95, l10: 95, season: 95, vsOpp: 95, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] }];
    const verdict = computeVerdict(enriched, extracted, { stats: 'live', injuries: 'live', odds: 'live' }, 'none');
    expect(verdict.confidencePct).toBeLessThanOrEqual(75);
  });

});
