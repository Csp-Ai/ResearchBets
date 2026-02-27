/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import AnalyzeTabPanel from '@/src/components/research/AnalyzeTabPanel';

const noop = vi.fn();

describe('AnalyzeTabPanel', () => {
  it('renders bettor-native recommendation language and avoids n/a output', () => {
    render(
      <AnalyzeTabPanel
        intelLegs={[
          { id: '1', selection: 'Player One over 22.5 points', market: 'points', line: '22.5', odds: '-110' },
          { id: '2', selection: 'Player Two over 7.5 rebounds', market: 'rebounds', line: '7.5', odds: '-108' }
        ]}
        legs={[
          { id: '1', selection: 'Player One over 22.5 points', l5: 60, l10: 58, risk: 'caution' },
          { id: '2', selection: 'Player Two over 7.5 rebounds', l5: 61, l10: 59, risk: 'caution' }
        ]}
        sortedLegs={[]}
        weakestLeg={null}
        runDto={null}
        currentRun={null}
        prefillKeyFromQuery=""
        copyStatus="idle"
        copySlipStatus="idle"
        onPasteOpen={noop}
        onTryExample={noop}
        onCopyReasons={noop}
        onCopySlip={noop}
        onShareRun={noop}
        slipHref="/slip"
        shareStatus="idle"
        demoSlip={'A over\nB over'}
      />
    );

    expect(screen.getByTestId('decision-terminal-verdict').textContent).toMatch(/TAKE|MODIFY|PASS/);
    expect(screen.queryByText(/n\/a/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });
});
