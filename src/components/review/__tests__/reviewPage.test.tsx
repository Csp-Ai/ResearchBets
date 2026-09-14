/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import ReviewPage from '@/app/(product)/review/page';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';
import { GUARDRAILS_STORAGE_KEY } from '@/src/core/guardrails/localGuardrails';

const renderDemoReview = () =>
  render(
    <NervousSystemProvider initialSpine={{ mode: 'demo' }}>
      <ReviewPage />
    </NervousSystemProvider>
  );

describe('/review page', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders in demo mode with seeded postmortem profile', () => {
    renderDemoReview();
    expect(screen.getByTestId('review-page')).toBeTruthy();
    expect(screen.getByTestId('edge-profile-card')).toBeTruthy();
    expect(screen.getByText('Recent Postmortems')).toBeTruthy();
  });

  it('applies next-time rule as guardrail', () => {
    renderDemoReview();
    fireEvent.click(screen.getAllByText('Expand detail')[0]!);
    fireEvent.click(screen.getByText('Apply as Guardrail'));
    const stored = window.localStorage.getItem(GUARDRAILS_STORAGE_KEY);
    expect(stored).toContain('assist_variance');
  });

  it('does not substitute a demo autopsy for a missing explicit ticket', () => {
    render(
      <NervousSystemProvider initialSpine={{ mode: 'demo', ticketId: 'missing-ticket' }}>
        <ReviewPage />
      </NervousSystemProvider>
    );
    expect(screen.getByText('No settled ticket to dissect yet.')).toBeTruthy();
    expect(screen.queryByText('Latest autopsy')).toBeNull();
    const pulse = screen.getByText('Open Ticket Pulse →').getAttribute('href');
    expect(new URL(pulse!, 'https://example.test').searchParams.get('ticketId')).toBe('missing-ticket');
  });
});
