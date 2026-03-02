import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('/api/run/stress-test POST', () => {
  it('returns canonical ResearchRunDTO from persisted run', async () => {
    const runSlip = vi.fn(async () => 'trace-canonical-1');
    const getRun = vi.fn(async () => ({
      trace_id: 'trace-canonical-1',
      traceId: 'trace-canonical-1',
      status: 'complete',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slipText: 'A points 20.5 (-110) [game:g1]',
      metadata: {},
      extractedLegs: [{ id: 'leg-1', selection: 'A points 20.5', market: 'points', line: '20.5', odds: '-110', player: 'A', sport: 'NBA' }],
      enrichedLegs: [{ extractedLegId: 'leg-1', l5: 62, l10: 65, season: 61, vsOpp: 63, flags: { injury: false, news: false }, evidenceNotes: [], riskScore: 11, riskBand: 'moderate', riskFactors: [], dataSources: { stats: 'fallback', injuries: 'fallback', odds: 'fallback' } }],
      analysis: { confidencePct: 61, weakestLegId: 'leg-1', reasons: ['reason-1'], riskLabel: 'Caution', computedAt: new Date().toISOString() },
      report: { mode: 'demo', trace_id: 'trace-canonical-1', reasons: [], legs: [], correlation_edges: [], script_clusters: [], failure_forecast: { top_reasons: [] } },
      sources: { stats: 'fallback', injuries: 'fallback', odds: 'fallback' }
    }));

    vi.doMock('@/src/core/pipeline/runSlip', () => ({ runSlip }));
    vi.doMock('@/src/core/run/store', () => ({ runStore: { getRun } }));

    const { POST } = await import('../route');
    const request = new Request('http://localhost:3000/api/run/stress-test?sport=nba&tz=UTC&date=2026-01-20&mode=demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legs: [
          { player: 'A', market: 'points', line: '20.5', odds: '-110', game_id: 'g1' },
          { player: 'B', market: 'rebounds', line: '8.5', odds: '+140', game_id: 'g1' }
        ]
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json() as { trace_id: string; run: { run_id: string; verdict: { reasons: string[] } } };
    expect(runSlip).toHaveBeenCalledOnce();
    expect(getRun).toHaveBeenCalledWith('trace-canonical-1');
    expect(body.trace_id).toBe('trace-canonical-1');
    expect(body.run.run_id).toBe('trace-canonical-1');
    expect(body.run.verdict.reasons).toEqual(['reason-1']);
  });
});
