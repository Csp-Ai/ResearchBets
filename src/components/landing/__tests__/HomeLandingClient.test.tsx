/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import HomeLandingClient from '@/app/HomeLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('@/src/core/run/store', () => ({
  getLatestTraceId: () => 'latest_trace_42'
}));

vi.mock('@/src/components/track/DuringStageTracker', () => ({
  DuringStageTracker: ({ trace_id }: { trace_id?: string }) => <div data-testid="during-stage-tracker-proxy">trace:{trace_id}</div>
}));

describe('HomeLandingClient', () => {
  it('attaches compact tracker to the active/latest run and renders continuity CTAs', async () => {
    renderWithProviders(<HomeLandingClient spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-01-01', mode: 'demo', trace_id: '' }} />);

    expect(await screen.findByText('trace:latest_trace_42')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open QuickSlip' }).getAttribute('href')).toContain('/slip?');
    expect(screen.getByRole('link', { name: 'Track latest run' }).getAttribute('href')).toContain('/track?');
  });
});
