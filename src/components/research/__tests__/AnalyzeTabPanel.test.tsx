/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import AnalyzeTabPanel from '@/src/components/research/AnalyzeTabPanel';

const noop = vi.fn();

describe('AnalyzeTabPanel', () => {
  afterEach(() => {
    cleanup();
  });
  it('does not render a TAKE/MODIFY/PASS verdict for Slip(0) and never shows Unknown Leg', () => {
    render(
      <AnalyzeTabPanel
        intelLegs={[]}
        legs={[]}
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
        boardHref="/today?tab=board"
        shareStatus="idle"
        demoSlip={'A over\nB over'}
      />
    );

    expect(screen.getByTestId('empty-slip-verdict-state').textContent).toContain('Add a slip to get a verdict.');
    expect(screen.queryByText(/\bTAKE\b|\bMODIFY\b|\bPASS\b/)).toBeNull();
    expect(screen.queryByText(/Unknown Leg/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Paste slip' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Try sample slip (demo)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Build from Board' })).toBeTruthy();
  });

  it('renders bettor-native recommendation language when slip legs exist', () => {
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
        boardHref="/today?tab=board"
        shareStatus="idle"
        demoSlip={'A over\nB over'}
      />
    );

    expect(screen.getAllByTestId('decision-terminal-verdict').at(-1)?.textContent).toMatch(/TAKE|MODIFY|PASS/);
    expect(screen.getByText(/Action: replace or remove this leg first/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Find replacement on Board' })).toBeTruthy();
    expect(screen.getByText(/Signal confidence/i)).toBeTruthy();
    expect(screen.queryByText(/Unknown Leg/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });
});
