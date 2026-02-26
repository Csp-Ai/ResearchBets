/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LiveOddsBadge } from '../LiveOddsBadge';

describe('LiveOddsBadge', () => {
  it('renders live odds chips when live odds are present', () => {
    render(
      <LiveOddsBadge
        consensus="-110"
        live_odds={[
          { book: 'Book A', odds: -108 },
          { book: 'Book B', odds: 102 }
        ]}
        best_odds={{ book: 'Book B', odds: 102 }}
      />
    );

    expect(screen.getByLabelText('live-odds-badges')).toBeTruthy();
    expect(screen.getByText('Book A -108')).toBeTruthy();
    expect(screen.getByText('Book B 102')).toBeTruthy();
  });

  it('renders consensus chip when live odds are not present', () => {
    render(<LiveOddsBadge consensus="-112" />);
    expect(screen.getByLabelText('consensus-odds-badge').textContent).toContain('consensus -112');
  });
});
