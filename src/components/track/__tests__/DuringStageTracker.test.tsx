/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DuringStageTracker } from '@/src/components/track/DuringStageTracker';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

vi.mock('@/src/hooks/useTraceEvents', () => ({
  useTraceEvents: vi.fn(),
}));

const mockedUseTraceEvents = vi.mocked(useTraceEvents);

describe('DuringStageTracker', () => {
  it('keeps proof collapsed by default and caps proof list to 5', () => {
    mockedUseTraceEvents.mockReturnValue({
      events: Array.from({ length: 9 }, (_, idx) => ({
        event_name: `slip_scored_${idx}`,
        created_at: `2026-01-01T00:00:0${idx}.000Z`,
        trace_id: 'trace-1',
        payload: {},
      })),
      loading: false,
      error: null,
      isLive: true,
      refresh: vi.fn(async () => undefined),
    });

    render(<DuringStageTracker trace_id="trace-1" mode="live" />);

    expect(screen.queryByTestId('during-proof-list')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show proof' }));

    const list = screen.getByTestId('during-proof-list');
    expect(list.querySelectorAll('li')).toHaveLength(5);
  });

  it('renders closest leg + next break risk only when data is available and non-compact', () => {
    mockedUseTraceEvents.mockReturnValue({
      events: [
        {
          event_name: 'slip_scored',
          created_at: '2026-01-01T00:00:00.000Z',
          trace_id: 'trace-2',
          payload: { selection: 'J. Brunson over 24.5 points', leg_delta: 0.4, risk_band: 'High' },
        },
      ],
      loading: false,
      error: null,
      isLive: true,
      refresh: vi.fn(async () => undefined),
    });

    const { rerender } = render(<DuringStageTracker trace_id="trace-2" mode="live" />);
    expect(screen.getByTestId('during-sweat-surface')).toBeTruthy();
    expect(screen.getByText(/Closest leg:/)).toBeTruthy();
    expect(screen.getByText(/Next break risk:/)).toBeTruthy();

    rerender(<DuringStageTracker trace_id="trace-2" mode="live" compact />);
    expect(screen.queryByTestId('during-sweat-surface')).toBeNull();
  });
});
