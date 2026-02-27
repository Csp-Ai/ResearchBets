/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReviewPanel } from '@/app/control/ReviewPanel';

describe('ReviewPanel', () => {
  it('renders share button for run review workflow', () => {
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
        postmortem={null}
        shareStatus="idle"
        onShare={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });
});
