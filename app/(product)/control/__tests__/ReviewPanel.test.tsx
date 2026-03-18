/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReviewPanel } from '@/app/(product)/control/ReviewPanel';

describe('ReviewPanel', () => {
  it('renders provenance strip with truthful source, continuity ids, and unavailable confidence copy', () => {
    render(
      <ReviewPanel
        retroDto={{
          run_id: 'run-1',
          trace_id: 'trace-1',
          raw_slip_text: 'Player A over 20.5',
          legs: [{ id: 'leg-1', selection: 'Player A over 20.5', evidenceStrength: 70, volatility: 'moderate', notes: [], riskFlags: [], provenance: { source: 'DEMO' } }],
          verdict: {
            decision: 'MODIFY',
            confidence: 61,
            risk: 'MED',
            weakest_leg_id: 'leg-1',
            fragility_score: 64,
            correlation_flag: true,
            volatility_summary: '1/1 high-vol legs',
            reasons: ['Line drifted against us']
          },
          provenance: { source: 'DEMO' }
        }}
        uploadName="sample.png"
        provenance={{
          source_type: 'screenshot_ocr',
          parse_status: 'partial',
          parse_confidence: null,
          had_manual_edits: true,
          trace_id: 'trace-1',
          slip_id: 'slip-1',
          generated_at: '2026-03-18T00:00:00.000Z'
        }}
        postmortem={null}
        shareStatus="idle"
        onShare={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
    expect(screen.getByText(/real parsed review/i)).toBeTruthy();
    expect(screen.getByText('Screenshot OCR')).toBeTruthy();
    expect(screen.getByText('Parse partial')).toBeTruthy();
    expect(screen.getByText('Confidence unavailable')).toBeTruthy();
    expect(screen.getByText('Manual edits applied')).toBeTruthy();
    expect(screen.getByText(/trace_id: trace-1 · slip_id: slip-1/i)).toBeTruthy();
  });

  it('renders demo sample provenance with numeric confidence when available', () => {
    render(
      <ReviewPanel
        retroDto={{
          run_id: 'run-demo',
          trace_id: 'trace-demo',
          raw_slip_text: 'Player A over 20.5',
          legs: [{ id: 'leg-1', selection: 'Player A over 20.5', evidenceStrength: 70, volatility: 'moderate', notes: [], riskFlags: [], provenance: { source: 'DEMO' } }],
          verdict: {
            decision: 'KEEP',
            confidence: 61,
            risk: 'LOW',
            weakest_leg_id: 'leg-1',
            fragility_score: 24,
            correlation_flag: false,
            volatility_summary: '0/1 high-vol legs',
            reasons: ['Stable shape']
          },
          provenance: { source: 'DEMO' }
        }}
        uploadName="Sample review (demo)"
        provenance={{
          source_type: 'demo_sample',
          parse_status: 'success',
          parse_confidence: 0.82,
          had_manual_edits: false,
          trace_id: 'trace-demo',
          slip_id: null,
          generated_at: '2026-03-18T00:00:00.000Z'
        }}
        postmortem={null}
        shareStatus="idle"
        onShare={vi.fn()}
      />
    );

    expect(screen.getByText(/demo sample review/i)).toBeTruthy();
    expect(screen.getByText('Demo sample')).toBeTruthy();
    expect(screen.getByText('Parse complete')).toBeTruthy();
    expect(screen.getByText('82% confidence')).toBeTruthy();
    expect(screen.getByText(/explicit demo sample path/i)).toBeTruthy();
  });
});
