/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import ResearchPageContent from '@/src/components/research/ResearchPageContent';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const runSlipMock = vi.fn();

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: pushMock, replace: replaceMock }),
    useSearchParams: () => new URLSearchParams('tab=analyze')
  };
});

vi.mock('@/src/core/pipeline/runSlip', () => ({
  computeLegRisk: vi.fn(() => ({ riskScore: 0 })),
  runSlip: (...args: unknown[]) => runSlipMock(...args)
}));

vi.mock('@/src/core/run/store', () => ({
  getLatestTraceId: vi.fn(() => null),
  runStore: {
    listRuns: vi.fn(async () => []),
    getRun: vi.fn(async () => null)
  }
}));

vi.mock('@/src/core/ui/preferences', () => ({
  LIVE_MODE_EVENT: 'rb-live-mode',
  readCoverageAgentEnabled: () => false,
  readDeveloperMode: () => false,
  readLiveModeEnabled: () => false
}));

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: [], addLeg: vi.fn(), removeLeg: vi.fn(), getSlip: vi.fn(), updateLeg: vi.fn(), setSlip: vi.fn(), clearSlip: vi.fn() })
}));

describe('ResearchPageContent demo mode auto-run', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    runSlipMock.mockReset();
    runSlipMock.mockResolvedValue('trace-demo-123');

    window.history.replaceState({}, '', '/?sport=NBA&date=2026-02-26&tz=America%2FPhoenix&mode=demo');

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/bettor-data')) {
        return { ok: true, json: async () => ({ mode: 'demo' }) } as Response;
      }
      if (url.includes('/api/research/demo-run')) {
        return { ok: true, json: async () => ({ traceId: 'demo-trace', steps: ['Scout'], weakestLeg: 'Demo', generatedAt: new Date().toISOString(), ctas: [] }) } as Response;
      }
      if (url.includes('/api/metrics/calibration')) {
        return { ok: true, json: async () => ({ data: { take_accuracy: 0, weakest_leg_accuracy: 0, runs_analyzed: 0, last_updated: null } }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }));
  });

  it('auto-runs deterministic demo slip and routes to analyze trace share spine', async () => {
    render(
      <NervousSystemProvider>
        <ResearchPageContent />
      </NervousSystemProvider>
    );

    await waitFor(() => expect(runSlipMock).toHaveBeenCalledTimes(1));
    expect(runSlipMock.mock.calls[0]?.[0]).toContain('Jayson Tatum over 29.5 points');

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    const href = String(replaceMock.mock.calls[0]?.[0] ?? '');
    expect(href).toContain('trace_id=trace-demo-123');
    expect(href).toContain('tab=analyze');
    expect(href).toContain('sport=NBA');
    expect(href).toContain('date=2026-02-26');
    expect(href).toContain('tz=America%2FPhoenix');
    expect(href).toContain('mode=demo');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
