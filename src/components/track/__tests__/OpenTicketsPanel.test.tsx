/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OpenTicketsPanel } from '@/src/components/track/OpenTicketsPanel';

describe('OpenTicketsPanel', () => {
  it('renders deterministic demo tickets when there are no stored open slips', () => {
    window.localStorage.clear();
    render(<OpenTicketsPanel mode="demo" />);

    expect(screen.getByTestId('open-tickets-panel')).toBeTruthy();
    expect(screen.getByText('Open Tickets')).toBeTruthy();
    expect(screen.getByText(/Ticket #1/)).toBeTruthy();
    expect(screen.getByTestId('exposure-row')).toBeTruthy();
  });
});
