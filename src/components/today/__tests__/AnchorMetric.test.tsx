/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AnchorMetric } from '../AnchorMetric';
import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';

describe('AnchorMetric', () => {
  it('renders empty state hint', () => {
    render(<AnchorMetric />);

    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Add 2–4 legs to see fragility.')).toBeTruthy();
  });

  it('renders fragility from report', async () => {
    const report: SlipStructureReport = {
      mode: 'demo',
      risk_band: 'high',
      confidence_band: 'med',
      weakest_leg_id: 'leg-1',
      legs: [{ leg_id: 'leg-1', market: 'points', player: 'Player A' }],
      correlation_edges: [{ a_leg_id: 'leg-1', b_leg_id: 'leg-2', kind: 'same_game', severity: 'med', reason: 'shared' }],
      script_clusters: [],
      failure_forecast: { top_reasons: ['Reason 1'] },
      reasons: []
    };

    render(<AnchorMetric report={report} />);

    expect(await screen.findByText(/%/)).toBeTruthy();
    expect(screen.getByText(/Weakest leg: Player A/)).toBeTruthy();
  });
});
