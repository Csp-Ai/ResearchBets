/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ReviewPanel } from '@/app/(product)/control/ReviewPanel';

describe('ReviewPanel', () => {
  afterEach(() => cleanup());
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

  it('renders weakest-leg attribution chips and explanation', () => {
    render(
      <ReviewPanel
        retroDto={{
          run_id: 'run-attr',
          trace_id: 'trace-attr',
          slip_id: 'slip-attr',
          raw_slip_text: 'Victor Wembanyama over 11.5 rebounds',
          legs: [{ id: 'leg-7', selection: 'Victor Wembanyama over 11.5 rebounds', player: 'Victor Wembanyama', market: 'rebounds', line: '11.5', evidenceStrength: 58, volatility: 'high', notes: [], riskFlags: ['blowout'], provenance: { source: 'LIVE' } }],
          verdict: {
            decision: 'MODIFY',
            confidence: 54,
            risk: 'HIGH',
            weakest_leg_id: 'leg-7',
            fragility_score: 72,
            correlation_flag: false,
            volatility_summary: '1/1 high-vol legs',
            reasons: ['Highest downside: Victor Wembanyama over 11.5 rebounds']
          },
          provenance: { source: 'LIVE' }
        }}
        uploadName="review.txt"
        provenance={{
          source_type: 'pasted_text',
          parse_status: 'success',
          parse_confidence: 0.93,
          had_manual_edits: false,
          trace_id: 'trace-attr',
          slip_id: 'slip-attr',
          generated_at: '2026-03-18T00:00:00.000Z'
        }}
        postmortem={{
          ok: true,
          trace_id: 'trace-attr',
          slip_id: 'slip-attr',
          attribution: {
            trace_id: 'trace-attr',
            slip_id: 'slip-attr',
            outcome: 'loss',
            breaker_leg_id: 'leg-7',
            weakest_leg: {
              leg_id: 'leg-7',
              player: 'Victor Wembanyama',
              prop_type: 'rebounds',
              expected_vs_actual: '8/11.5 rebounds',
              status: 'miss'
            },
            cause_tags: ['blowout_minutes_risk', 'late_game_inactivity'],
            confidence_level: 'high',
            summary_explanation: 'This slip was most exposed to Victor Wembanyama rebounds due to blowout minutes risk and reduced second-half usage.',
            narrative: 'This slip was most exposed to Victor Wembanyama rebounds due to blowout minutes risk and reduced second-half usage.'
          },
          classification: {
            process: 'Good process / bad variance',
            correlationMiss: false,
            injuryImpact: false,
            lineValueMiss: false
          },
          notes: ['No major correlation concentration detected.'],
          correlationScore: 0,
          volatilityTier: 'High',
          exposureSummary: {
            topGames: [],
            topPlayers: []
          }
        }}
        shareStatus="idle"
        onShare={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Weakest leg/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Victor Wembanyama rebounds$/i)).toBeTruthy();
    expect(screen.getByText(/Current vs target: 8\/11.5 rebounds/i)).toBeTruthy();
    expect(screen.getByText('Blowout Minutes Risk')).toBeTruthy();
    expect(screen.getByText('Late Game Inactivity')).toBeTruthy();
    expect(screen.getByText(/most exposed to Victor Wembanyama rebounds/i)).toBeTruthy();
    expect(screen.getByText(/Confidence: High/i)).toBeTruthy();
  });
});
