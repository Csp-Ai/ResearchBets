/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ReviewPage from '@/app/review/page';

describe('/review page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders in demo mode with seeded postmortem profile', () => {
    render(<ReviewPage />);
    expect(screen.getByTestId('review-page')).toBeTruthy();
    expect(screen.getByTestId('edge-profile-card')).toBeTruthy();
    expect(screen.getByText('Recent Postmortems')).toBeTruthy();
  });
});
