import { describe, expect, it, vi } from 'vitest';

import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';
import {
  REVIEW_DEMO_SAMPLE_NAME,
  REVIEW_DEMO_SAMPLE_TEXT,
  ReviewIngestionError,
  runReviewIngestion
} from '@/src/core/control/reviewIngestion';

const makeDto = (overrides: Partial<ResearchRunDTO> = {}): ResearchRunDTO => ({
  run_id: 'trace-review-1',
  trace_id: 'trace-review-1',
  slip_id: '00000000-0000-0000-0000-000000000111',
  raw_slip_text: 'Jayson Tatum over 29.5 points (-110)',
  legs: [
    {
      id: 'leg-1',
      selection: 'Jayson Tatum over 29.5 points (-110)',
      market: 'points',
      line: '29.5',
      odds: '-110',
      player: 'Jayson Tatum',
      evidenceStrength: 72,
      volatility: 'moderate',
      notes: [],
      riskFlags: ['Line drifted against us'],
      provenance: { source: 'CACHE' }
    }
  ],
  verdict: {
    decision: 'MODIFY',
    confidence: 61,
    risk: 'MED',
    weakest_leg_id: 'leg-1',
    fragility_score: 64,
    correlation_flag: false,
    volatility_summary: '0/1 high-vol legs',
    reasons: ['Highest downside: Jayson Tatum over 29.5 points (-110) — Line drifted against us.']
  },
  provenance: { source: 'CACHE' },
  ...overrides
});

describe('runReviewIngestion', () => {
  it('uses parse + run + postmortem for the default real review path and preserves continuity identity', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              rawSlipText: 'Jayson Tatum over 29.5 points (-110)',
              trace_id: 'trace-review-1',
              slip_id: '00000000-0000-0000-0000-000000000111',
              legs: [{ rawText: 'Jayson Tatum over 29.5 points (-110)' }]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            trace_id: 'trace-review-1',
            slip_id: '00000000-0000-0000-0000-000000000111',
            classification: {
              process: 'Good process / bad variance',
              correlationMiss: false,
              injuryImpact: false,
              lineValueMiss: true
            },
            notes: ['No major correlation concentration detected.'],
            correlationScore: 0,
            volatilityTier: 'Med',
            exposureSummary: { topGames: [], topPlayers: [] }
          }),
          { status: 200 }
        )
      );
    const runSlip = vi.fn(async () => 'trace-review-1');
    const getRun = vi.fn(async () => ({ id: 'run-1' }));
    const toResearchRunDTOFromRun = vi.fn(() => makeDto());

    const result = await runReviewIngestion(
      {
        text: 'Jayson Tatum over 29.5 points (-110)',
        outcome: 'loss',
        mode: 'paste',
        sourceHint: 'paste',
        inputLabel: 'Pasted review input',
        continuity: {
          trace_id: 'trace-review-1',
          slip_id: '00000000-0000-0000-0000-000000000111'
        }
      },
      {
        fetchImpl: fetchMock as typeof fetch,
        runSlip,
        runStore: { getRun } as unknown as typeof import('@/src/core/run/store').runStore,
        toResearchRunDTOFromRun
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/slips/parseText');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      text: 'Jayson Tatum over 29.5 points (-110)',
      trace_id: 'trace-review-1',
      slip_id: '00000000-0000-0000-0000-000000000111'
    });
    expect(runSlip).toHaveBeenCalledWith('Jayson Tatum over 29.5 points (-110)', {
      trace_id: 'trace-review-1',
      slip_id: '00000000-0000-0000-0000-000000000111'
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      trace_id: 'trace-review-1',
      slip_id: '00000000-0000-0000-0000-000000000111',
      mode: 'live',
      outcome: 'loss'
    });
    expect(result.dto.trace_id).toBe('trace-review-1');
    expect(result.postmortem.ok).toBe(true);
    expect(result.mode).toBe('paste');
  });

  it('keeps demo review explicit and separate from the default live/review path', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              rawSlipText: REVIEW_DEMO_SAMPLE_TEXT,
              trace_id: 'trace-demo-review',
              legs: [{ rawText: 'demo leg' }]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            classification: {
              process: 'Good process / expected outcome',
              correlationMiss: false,
              injuryImpact: false,
              lineValueMiss: false
            },
            notes: ['Demo note'],
            correlationScore: 0,
            volatilityTier: 'Low',
            exposureSummary: { topGames: [], topPlayers: [] }
          }),
          { status: 200 }
        )
      );

    const result = await runReviewIngestion(
      {
        text: REVIEW_DEMO_SAMPLE_TEXT,
        outcome: 'loss',
        mode: 'demo',
        sourceHint: 'demo',
        inputLabel: REVIEW_DEMO_SAMPLE_NAME
      },
      {
        fetchImpl: fetchMock as typeof fetch,
        runSlip: vi.fn(async () => 'trace-demo-review'),
        runStore: { getRun: vi.fn(async () => ({ id: 'run-demo' })) } as unknown as typeof import('@/src/core/run/store').runStore,
        toResearchRunDTOFromRun: vi.fn(() => makeDto({ trace_id: 'trace-demo-review', run_id: 'trace-demo-review', slip_id: undefined }))
      }
    );

    expect(result.mode).toBe('demo');
    expect(result.inputLabel).toBe(REVIEW_DEMO_SAMPLE_NAME);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ mode: 'demo' });
  });

  it('returns a truthful parse failure instead of silently swapping to fake success', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: { message: 'Could not parse this slip yet.' }
        }),
        { status: 400 }
      )
    );

    await expect(
      runReviewIngestion(
        {
          text: '???',
          outcome: 'loss',
          mode: 'paste',
          sourceHint: 'paste',
          inputLabel: 'Broken input'
        },
        {
          fetchImpl: fetchMock as typeof fetch,
          runSlip: vi.fn(async () => 'trace-unused'),
          runStore: { getRun: vi.fn(async () => null) } as unknown as typeof import('@/src/core/run/store').runStore,
          toResearchRunDTOFromRun: vi.fn()
        }
      )
    ).rejects.toMatchObject({
      code: 'parse_failed',
      message: 'Could not parse this slip yet.'
    });
  });
});
