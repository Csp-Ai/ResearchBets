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
    const emittedEvents: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/slips/submit')) {
        return new Response(JSON.stringify({ slip_id: '00000000-0000-0000-0000-000000000001' }), {
          status: 200
        });
      }

      if (url.includes('/api/slips/extract')) {
        return new Response(
          JSON.stringify({
            extracted_legs: [
              { selection: 'Jayson Tatum over 29.5 points (-110)', market: 'points', odds: '-110' }
            ]
          }),
          { status: 200 }
        );
      }

      if (url.includes('/api/events')) {
        const payload = JSON.parse(String(init?.body ?? '{}')) as { event_name?: string };
        if (payload.event_name) emittedEvents.push(payload.event_name);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
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
    expect(run?.report?.legs.length).toBeGreaterThan(0);
    expect(run?.report?.weakest_leg_id).toBeTruthy();
    expect(run?.trustedContext?.fallbackReason).toBe('No verified update from trusted sources.');
    expect(emittedEvents).toEqual([
      'slip_enrich_started',
      'slip_enrich_done',
      'slip_scored',
      'slip_verdict_ready',
      'slip_persisted'
    ]);
  });

  it('keeps generated trace_id precedence when no explicit trace_id is provided', async () => {
    const serverTraceId = 'trace-from-server-123';
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/slips/submit')) {
        return new Response(
          JSON.stringify({
            slip_id: '00000000-0000-0000-0000-000000000042',
            trace_id: serverTraceId
          }),
          { status: 200 }
        );
      }

      if (url.includes('/api/slips/extract')) {
        return new Response(
          JSON.stringify({
            extracted_legs: [
              {
                selection: 'LeBron James over 6.5 rebounds (-105)',
                market: 'rebounds',
                odds: '-105'
              }
            ]
          }),
          { status: 200 }
        );
      }

      return new Response('{}', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const traceId = await runSlip('LeBron James over 6.5 rebounds (-105)');
    const run = await runStore.getRun(traceId);

    expect(traceId).not.toBe(serverTraceId);
    expect(run?.trace_id).toBe(traceId);
  });

  it('uses explicit trace_id precedence over server trace_id', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/slips/submit')) {
        return new Response(
          JSON.stringify({
            slip_id: '00000000-0000-0000-0000-000000000052',
            trace_id: 'trace-from-server-052'
          }),
          { status: 200 }
        );
      }

      if (url.includes('/api/slips/extract')) {
        return new Response(
          JSON.stringify({
            extracted_legs: [
              { selection: 'Luka Doncic over 7.5 assists (-110)', market: 'assists', odds: '-110' }
            ]
          }),
          { status: 200 }
        );
      }

      return new Response('{}', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const traceId = await runSlip('Luka Doncic over 7.5 assists (-110)', {
      trace_id: 'trace-explicit-052'
    });
    const run = await runStore.getRun(traceId);

    expect(traceId).toBe('trace-explicit-052');
    expect(run?.trace_id).toBe('trace-explicit-052');
  });

  it('preserves pre-issued slip_id and trace_id through stress-test execution', async () => {
    const continuity = {
      slip_id: '00000000-0000-0000-0000-000000000077',
      trace_id: 'trace-draft-077'
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/slips/submit')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          slip_id?: string;
          trace_id?: string;
        };
        expect(body.slip_id).toBe(continuity.slip_id);
        expect(body.trace_id).toBe(continuity.trace_id);
        return new Response(
          JSON.stringify({ slip_id: continuity.slip_id, trace_id: continuity.trace_id }),
          { status: 200 }
        );
      }

      if (url.includes('/api/slips/extract')) {
        return new Response(
          JSON.stringify({
            extracted_legs: [
              {
                selection: 'Anthony Edwards over 5.5 rebounds (-110)',
                market: 'rebounds',
                odds: '-110'
              }
            ]
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const traceId = await runSlip('Anthony Edwards over 5.5 rebounds (-110)', continuity);
    const run = await runStore.getRun(traceId);

    expect(traceId).toBe(continuity.trace_id);
    expect(run?.trace_id).toBe(continuity.trace_id);
    expect(run?.slipId).toBe(continuity.slip_id);
    expect(run?.report?.slip_id).toBe(continuity.slip_id);
  });

  it('computeVerdict keeps weakest leg aligned with sorted risk and reason wording', () => {
    const extracted = [
      { id: 'a', selection: 'Leg A' },
      { id: 'b', selection: 'Leg B' },
      { id: 'c', selection: 'Leg C' }
    ];
    const enriched = [
      {
        extractedLegId: 'a',
        l5: 40,
        l10: 45,
        season: 44,
        vsOpp: 42,
        flags: { injury: null, news: null, lineMove: null, divergence: null },
        evidenceNotes: []
      },
      {
        extractedLegId: 'b',
        l5: 60,
        l10: 62,
        season: 58,
        vsOpp: 57,
        flags: { injury: null, news: null, lineMove: null, divergence: null },
        evidenceNotes: []
      },
      {
        extractedLegId: 'c',
        l5: 75,
        l10: 76,
        season: 73,
        vsOpp: 70,
        flags: { injury: null, news: null, lineMove: null, divergence: null },
        evidenceNotes: []
      }
    ];

    const verdict = computeVerdict(enriched, extracted, {
      stats: 'fallback',
      injuries: 'fallback',
      odds: 'fallback'
    });

    expect(verdict.weakestLegId).toBe('a');
    expect(verdict.reasons[0]).toContain('Highest downside: Leg A');
    expect(verdict.reasons.join(' ')).toContain('No downside drivers flagged');
    expect(verdict.confidencePct).toBeLessThanOrEqual(65);
  });

  it('does not increase confidence from unverified-only context', () => {
    const extracted = [{ id: 'a', selection: 'Leg A' }];
    const enriched = [
      {
        extractedLegId: 'a',
        l5: 95,
        l10: 95,
        season: 95,
        vsOpp: 95,
        flags: { injury: null, news: null, lineMove: null, divergence: null },
        evidenceNotes: []
      }
    ];
    const verdict = computeVerdict(
      enriched,
      extracted,
      { stats: 'live', injuries: 'live', odds: 'live' },
      'none',
      [
        { kind: 'injury', headline: 'unverified 1' },
        { kind: 'injury', headline: 'unverified 2' }
      ]
    );
    expect(verdict.confidencePct).toBeLessThanOrEqual(72);
    expect(verdict.dataQuality?.hasUnverified).toBe(true);
  });

  it('caps confidence when trusted injury coverage is none', () => {
    const extracted = [{ id: 'a', selection: 'Leg A' }];
    const enriched = [
      {
        extractedLegId: 'a',
        l5: 95,
        l10: 95,
        season: 95,
        vsOpp: 95,
        flags: { injury: null, news: null, lineMove: null, divergence: null },
        evidenceNotes: []
      }
    ];
    const verdict = computeVerdict(
      enriched,
      extracted,
      { stats: 'live', injuries: 'live', odds: 'live' },
      'none'
    );
    expect(verdict.confidencePct).toBeLessThanOrEqual(75);
  });
});
