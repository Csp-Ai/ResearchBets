/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import { deriveLandingHooks } from '@/src/components/landing/deriveHooks';
import { LandingHooks } from '@/src/components/landing/LandingHooks';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

const payload = {
  mode: 'demo' as const,
  reason: 'deterministic_fallback',
  games: [{ id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' }],
  board: [
    { id: 'p1', gameId: 'g1', player: 'Player A', market: 'points', line: '22.5', odds: '+105', hitRateL10: 66, riskTag: 'stable' as const },
    { id: 'p2', gameId: 'g1', player: 'Player B', market: 'rebounds', line: '8.5', odds: '-115', hitRateL10: 52, riskTag: 'watch' as const }
  ]
};

describe('LandingHooks', () => {
  it('derives deterministic hooks for demo payload and opens Learn why drawer', () => {
    const hooks = deriveLandingHooks(payload, []);
    expect(hooks.length).toBeGreaterThan(0);

    renderWithNervousSystem(<LandingHooks hooks={hooks} />);

    const learnWhy = screen.getAllByRole('button', { name: 'Learn why' })[0];
    fireEvent.click(learnWhy as HTMLElement);

    expect(screen.getByText(/Research cue only — no picks/i)).toBeTruthy();
  });
});
