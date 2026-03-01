/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ProBuildPanel } from '@/src/components/slips/ProBuildPanel';
import { GUARDRAILS_STORAGE_KEY } from '@/src/core/guardrails/localGuardrails';

const legs = [
  { id: '1', player: 'A', marketType: 'points' as const, line: '22.5', confidence: 0.71, game: 'A@B' },
  { id: '2', player: 'B', marketType: 'assists' as const, line: '8.5', confidence: 0.55, game: 'A@B' },
  { id: '3', player: 'C', marketType: 'rebounds' as const, line: '9.5', confidence: 0.66, game: 'C@D' }
];

describe('ProBuildPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders and applies deterministic rebuild', () => {
    const onApply = vi.fn();
    render(<ProBuildPanel legs={legs} onApply={onApply} />);
    expect(screen.getByTestId('pro-build-panel')).toBeTruthy();
    expect(screen.getByText(/Hit est:/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Apply 2-leg Pro'));
    expect(onApply).toHaveBeenCalledTimes(1);
    const picked = onApply.mock.calls[0]?.[0] as typeof legs;
    expect(picked).toHaveLength(2);
    expect(picked[0]?.id).toBe('1');
  });



  it('caps assists exposure in pro rebuild selections', () => {
    const onApply = vi.fn();
    const assistHeavyLegs = [
      { id: '1', player: 'A', marketType: 'assists' as const, line: '6.5', confidence: 0.72, game: 'A@B' },
      { id: '2', player: 'B', marketType: 'assists' as const, line: '5.5', confidence: 0.7, game: 'C@D' },
      { id: '3', player: 'C', marketType: 'points' as const, line: '21.5', confidence: 0.74, game: 'E@F' },
      { id: '4', player: 'D', marketType: 'rebounds' as const, line: '8.5', confidence: 0.69, game: 'G@H' }
    ];

    render(<ProBuildPanel legs={assistHeavyLegs} onApply={onApply} />);
    fireEvent.click(screen.getAllByText('Apply 3-leg Pro').at(-1)!);

    const picked = onApply.mock.calls[0]?.[0] as typeof assistHeavyLegs;
    const assistCount = picked.filter((leg) => leg.marketType === 'assists').length;
    expect(assistCount).toBeLessThanOrEqual(1);
  });

  it('shows persisted guardrails in warnings', () => {
    window.localStorage.setItem(GUARDRAILS_STORAGE_KEY, JSON.stringify([
      { key: 'overleveraged', title: 'Reduce total leg count', body: 'Keep slips compact.', createdAt: '2026-01-01T00:00:00.000Z' }
    ]));
    render(<ProBuildPanel legs={legs} onApply={() => undefined} />);
    expect(screen.getByText(/Active guardrail: Reduce total leg count/i)).toBeTruthy();
  });
});
