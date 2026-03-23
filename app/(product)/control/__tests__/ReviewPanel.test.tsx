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
          legs: [
            {
              id: 'leg-1',
              selection: 'Player A over 20.5',
              evidenceStrength: 70,
              volatility: 'moderate',
              notes: [],
              riskFlags: [],
              provenance: { source: 'DEMO' }
            }
          ],
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
          legs: [
            {
              id: 'leg-1',
              selection: 'Player A over 20.5',
              evidenceStrength: 70,
              volatility: 'moderate',
              notes: [],
              riskFlags: [],
              provenance: { source: 'DEMO' }
            }
          ],
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
          legs: [
            {
              id: 'leg-7',
              selection: 'Victor Wembanyama over 11.5 rebounds',
              player: 'Victor Wembanyama',
              market: 'rebounds',
              line: '11.5',
              evidenceStrength: 58,
              volatility: 'high',
              notes: [],
              riskFlags: ['blowout'],
              provenance: { source: 'LIVE' }
            }
          ],
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
          pattern_summary: {
            recurring_tags: [
              { tag: 'blowout_minutes_risk', count: 3, percentage: 0.75 },
              { tag: 'line_too_aggressive', count: 2, percentage: 0.5 }
            ],
            common_failure_mode: 'blowout_sensitive_scoring',
            sample_size: 4,
            confidence_level: 'medium',
            recommendation_summary:
              'Across recent reviews, the most common misses came from aggressive scoring looks in blowout-sensitive scripts.',
            recent_examples: [
              {
                reviewed_at: '2026-03-18T00:00:00.000Z',
                player: 'Victor Wembanyama',
                prop_type: 'rebounds',
                tag: 'blowout_minutes_risk',
                trace_id: 'trace-attr',
                slip_id: 'slip-attr'
              }
            ]
          },
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
            summary_explanation:
              'This slip was most exposed to Victor Wembanyama rebounds due to blowout minutes risk and reduced second-half usage.',
            narrative:
              'This slip was most exposed to Victor Wembanyama rebounds due to blowout minutes risk and reduced second-half usage.'
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
    expect(screen.getByText(/^Review postmortem$/i)).toBeTruthy();
    expect(
      screen.getByText(
        /late-game dependency showed up before settlement and still carried through/i
      )
    ).toBeTruthy();
    expect(screen.getByText(/Confidence: High/i)).toBeTruthy();
    expect(screen.getByTestId('bettor-pattern-summary')).toBeTruthy();
    expect(
      screen.getByText(
        /Across recent reviews, the most common misses came from aggressive scoring looks in blowout-sensitive scripts/i
      )
    ).toBeTruthy();
    expect(screen.getByText(/4 reviewed slips/i)).toBeTruthy();
  });

  it('does not show bettor pattern summary when attribution history is missing', () => {
    render(
      <ReviewPanel
        retroDto={{
          run_id: 'run-no-pattern',
          trace_id: 'trace-no-pattern',
          raw_slip_text: 'Player A over 20.5',
          legs: [
            {
              id: 'leg-1',
              selection: 'Player A over 20.5',
              evidenceStrength: 70,
              volatility: 'moderate',
              notes: [],
              riskFlags: [],
              provenance: { source: 'DEMO' }
            }
          ],
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
        uploadName="review.txt"
        provenance={{
          source_type: 'pasted_text',
          parse_status: 'success',
          parse_confidence: 0.93,
          had_manual_edits: false,
          trace_id: 'trace-no-pattern',
          slip_id: 'slip-no-pattern',
          generated_at: '2026-03-18T00:00:00.000Z'
        }}
        postmortem={{
          ok: true,
          trace_id: 'trace-no-pattern',
          slip_id: 'slip-no-pattern',
          attribution: null,
          classification: {
            process: 'Good process / expected outcome',
            correlationMiss: false,
            injuryImpact: false,
            lineValueMiss: false
          },
          notes: [],
          correlationScore: 0,
          volatilityTier: 'Low',
          exposureSummary: {
            topGames: [],
            topPlayers: []
          }
        }}
        shareStatus="idle"
        onShare={vi.fn()}
      />
    );

    expect(screen.queryByTestId('bettor-pattern-summary')).toBeNull();
  });

  it('renders bettor pattern summary from prior reviewed slips even when current attribution is unavailable', () => {
    render(
      <ReviewPanel
        retroDto={{
          run_id: 'run-supported-pattern',
          trace_id: 'trace-supported-pattern',
          raw_slip_text: 'Player A over 20.5',
          legs: [
            {
              id: 'leg-1',
              selection: 'Player A over 20.5',
              evidenceStrength: 70,
              volatility: 'moderate',
              notes: [],
              riskFlags: [],
              provenance: { source: 'LIVE' }
            }
          ],
          verdict: {
            decision: 'MODIFY',
            confidence: 55,
            risk: 'MED',
            weakest_leg_id: 'leg-1',
            fragility_score: 48,
            correlation_flag: false,
            volatility_summary: '1/1 high-vol legs',
            reasons: ['Stable shape']
          },
          provenance: { source: 'LIVE' }
        }}
        uploadName="review.txt"
        provenance={{
          source_type: 'pasted_text',
          parse_status: 'success',
          parse_confidence: 0.93,
          had_manual_edits: false,
          trace_id: 'trace-supported-pattern',
          slip_id: 'slip-supported-pattern',
          generated_at: '2026-03-18T00:00:00.000Z'
        }}
        postmortem={{
          ok: true,
          trace_id: 'trace-supported-pattern',
          slip_id: 'slip-supported-pattern',
          attribution: null,
          pattern_summary: {
            recurring_tags: [{ tag: 'correlated_legs', count: 4, percentage: 0.67 }],
            common_failure_mode: 'correlated_same_script_exposure',
            sample_size: 6,
            confidence_level: 'high',
            recommendation_summary:
              'Across recent reviews, the main repeat issue is stacking legs that depend on the same game script.',
            recent_examples: [
              {
                reviewed_at: '2026-03-18T00:00:00.000Z',
                player: 'Player A',
                prop_type: 'threes',
                tag: 'correlated_legs',
                trace_id: 'trace-1',
                slip_id: 'slip-1'
              }
            ]
          },
          classification: {
            process: 'Good process / expected outcome',
            correlationMiss: false,
            injuryImpact: false,
            lineValueMiss: false
          },
          notes: [],
          correlationScore: 0,
          volatilityTier: 'Low',
          exposureSummary: {
            topGames: [],
            topPlayers: []
          }
        }}
        shareStatus="idle"
        onShare={vi.fn()}
      />
    );

    expect(screen.getByTestId('bettor-pattern-summary')).toBeTruthy();
    expect(screen.getByText(/same game script/i)).toBeTruthy();
  });
});
