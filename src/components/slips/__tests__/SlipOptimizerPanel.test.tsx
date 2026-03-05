/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SlipOptimizerPanel } from '@/src/components/slips/SlipOptimizerPanel';

describe('SlipOptimizerPanel', () => {
  it('updates combined odds when legs are added', () => {
    const { rerender } = render(<SlipOptimizerPanel legs={[]} />);
    expect(screen.getByTestId('combined-odds').textContent).toBe('+100');

    rerender(<SlipOptimizerPanel legs={[{ id: '1', player: 'A', marketType: 'points', line: '20.5', odds: '-110' }]} />);
    expect(screen.getByTestId('combined-odds').textContent).toBe('-110');

    rerender(<SlipOptimizerPanel legs={[{ id: '1', player: 'A', marketType: 'points', line: '20.5', odds: '-110' }, { id: '2', player: 'B', marketType: 'assists', line: '6.5', odds: '+150', deadLegRisk: 'high', deadLegReasons: ['x'] }]} />);
    expect(screen.getByTestId('combined-odds').textContent).toBe('+375');
    expect(screen.getByText(/blocked \(dead-leg HIGH\)/i)).toBeTruthy();
  });
});
