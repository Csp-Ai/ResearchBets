/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import AnalyzeTabPanel from '@/src/components/research/AnalyzeTabPanel';

describe('AnalyzeTabPanel continuity context', () => {
  it('shows staged board carryover context when passed from board handoff', () => {
    render(
      <AnalyzeTabPanel
        intelLegs={[]}
        legs={[]}
        sortedLegs={[]}
        weakestLeg={null}
        runDto={null}
        currentRun={null}
        prefillKeyFromQuery="rb:research:scout-prefill"
        stagedContext={['Support cue: L5 trend', 'Watch-out: limited minutes']}
        copyStatus="idle"
        copySlipStatus="idle"
        onPasteOpen={vi.fn()}
        onTryExample={vi.fn()}
        onCopyReasons={vi.fn()}
        onCopySlip={vi.fn()}
        onShareRun={vi.fn()}
        slipHref="/slip"
        boardHref="/today"
        shareStatus="idle"
        demoSlip="Player over 1.5"
        latestRunHref={null}
      />
    );

    expect(screen.getByText('Board carryover')).toBeTruthy();
    expect(screen.getByText(/Support cue:/i)).toBeTruthy();
    expect(screen.getByText(/Watch-out:/i)).toBeTruthy();
    expect(screen.getByText('Staged from Board')).toBeTruthy();
  });
});
