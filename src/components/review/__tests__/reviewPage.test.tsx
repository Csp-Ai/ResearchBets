/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ReviewPage from '@/app/review/page';
import { GUARDRAILS_STORAGE_KEY } from '@/src/core/guardrails/localGuardrails';

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

  it('applies next-time rule as guardrail', () => {
    render(<ReviewPage />);
    fireEvent.click(screen.getAllByText('Expand detail')[0]!);
    fireEvent.click(screen.getByText('Apply as Guardrail'));
    const stored = window.localStorage.getItem(GUARDRAILS_STORAGE_KEY);
    expect(stored).toContain('assist_variance');
  });
});
