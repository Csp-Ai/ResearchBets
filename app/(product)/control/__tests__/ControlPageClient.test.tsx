/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ControlPageClient } from '@/app/(product)/control/ControlPageClient';
import type { ReviewProvenance } from '@/src/core/control/reviewIngestion';

const { runReviewIngestionMock, runOcrMock } = vi.hoisted(() => ({
  runReviewIngestionMock: vi.fn(),
  runOcrMock: vi.fn()
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=review')
}));

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: [], slip_id: 'draft-slip-1', trace_id: 'draft-trace-1' })
}));

vi.mock('@/src/components/nervous/NervousSystemContext', () => ({
  useNervousSystem: () => ({ mode: 'live', trace_id: 'nervous-trace-1', toHref: (path: string) => path })
}));

vi.mock('@/src/components/cockpit/CockpitHeader', () => ({
  CockpitHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/src/components/cockpit/CockpitShell', () => ({
  CockpitShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/src/components/ui/AliveEmptyState', () => ({
  AliveEmptyState: ({ title }: { title: string }) => <div>{title}</div>
}));

vi.mock('@/src/core/trace/shareHref', () => ({
  buildShareRunHref: () => 'https://example.test/share'
}));

vi.mock('@/src/core/control/reviewIngestion', async () => {
  const actual = await vi.importActual<typeof import('@/src/core/control/reviewIngestion')>('@/src/core/control/reviewIngestion');
  return {
    ...actual,
    runReviewIngestion: runReviewIngestionMock
  };
});

vi.mock('@/src/features/ingest/ocr/ocrClient', () => ({
  runOcr: runOcrMock
}));

vi.mock('@/src/core/pipeline/runSlip', () => ({ runSlip: vi.fn() }));
vi.mock('@/src/core/run/researchRunDTO', () => ({ toResearchRunDTOFromRun: vi.fn() }));
vi.mock('@/src/core/run/store', () => ({
  runStore: {
    listRuns: vi.fn(async () => [{ trace_id: 'latest-trace-1' }]),
    getRun: vi.fn(async () => ({ id: 'run-1' }))
  }
}));

const baseProvenance: ReviewProvenance = {
  source_type: 'screenshot_ocr',
  parse_status: 'partial',
  parse_confidence: null,
  had_manual_edits: true,
  trace_id: 'draft-trace-1',
  slip_id: 'draft-slip-1',
  generated_at: '2026-03-18T00:00:00.000Z'
};

describe('ControlPageClient review recovery flow', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    runReviewIngestionMock.mockReset();
    runOcrMock.mockReset();
  });

  it('shows screenshot extraction preview, allows correction, and marks manual edits on rerun', async () => {
    runOcrMock.mockResolvedValue('LeBron James over 6.5 rebounds');
    runReviewIngestionMock.mockResolvedValue({
      dto: {
        run_id: 'run-1',
        trace_id: 'draft-trace-1',
        slip_id: 'draft-slip-1',
        raw_slip_text: 'LeBron James over 7.5 rebounds',
        legs: [{ id: 'leg-1', selection: 'LeBron James over 7.5 rebounds', evidenceStrength: 70, volatility: 'moderate', notes: [], riskFlags: [], provenance: { source: 'CACHE' } }],
        verdict: {
          decision: 'MODIFY',
          confidence: 62,
          risk: 'MED',
          weakest_leg_id: 'leg-1',
          fragility_score: 60,
          correlation_flag: false,
          volatility_summary: '0/1 high-vol legs',
          reasons: ['OCR review reason']
        },
        provenance: { source: 'CACHE' }
      },
      postmortem: {
        ok: true,
        classification: { process: 'Adjusted after OCR cleanup', correlationMiss: false, injuryImpact: false, lineValueMiss: false },
        notes: ['OCR cleanup improved clarity.'],
        correlationScore: 0,
        volatilityTier: 'Med',
        exposureSummary: { topGames: [], topPlayers: [] }
      },
      parseTicket: { rawSlipText: 'LeBron James over 7.5 rebounds', legs: [{ parseConfidence: 'low', needsReview: true }] },
      trace_id: 'draft-trace-1',
      slip_id: 'draft-slip-1',
      mode: 'screenshot',
      inputLabel: 'slip.png',
      provenance: baseProvenance
    });

    render(<ControlPageClient />);

    const file = new File(['image'], 'slip.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/screenshot extraction preview/i)).toBeTruthy();
    const textarea = screen.getByPlaceholderText(/paste the real slip text/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('LeBron James over 6.5 rebounds');

    fireEvent.change(textarea, { target: { value: 'LeBron James over 7.5 rebounds' } });
    expect(screen.getByText(/manual edits pending/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /run review from extracted text/i }));

    await waitFor(() => expect(runReviewIngestionMock).toHaveBeenCalled());
    expect(runReviewIngestionMock.mock.calls[0]?.[0]).toMatchObject({
      mode: 'screenshot',
      sourceHint: 'screenshot',
      hadManualEdits: true,
      inputLabel: 'slip.png',
      continuity: {
        trace_id: 'draft-trace-1',
        slip_id: 'draft-slip-1'
      }
    });
    expect(await screen.findByText('Manual edits applied')).toBeTruthy();
  });

  it('keeps real review failures visible without silently swapping to demo', async () => {
    runOcrMock.mockResolvedValue('Messy OCR text');
    runReviewIngestionMock.mockRejectedValue(Object.assign(new Error('Could not parse this slip yet.'), { provenance: { ...baseProvenance, had_manual_edits: false, parse_status: 'failed' } }));

    render(<ControlPageClient />);

    const file = new File(['image'], 'slip.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const textarea = await screen.findByPlaceholderText(/paste the real slip text/i);
    fireEvent.change(textarea, { target: { value: 'Still messy OCR text' } });
    fireEvent.click(screen.getByRole('button', { name: /run review from extracted text/i }));

    expect(await screen.findByText(/real review could not be parsed/i)).toBeTruthy();
    expect(screen.getByText(/crop tighter around the slip/i)).toBeTruthy();
    expect(screen.queryByText(/demo sample review \(/i)).toBeNull();
  });
});
