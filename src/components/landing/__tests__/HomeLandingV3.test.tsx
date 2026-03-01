/** @vitest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import HomeLandingClientV4 from '@/src/components/landing/HomeLandingClientV4';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const mockGetLatestTraceId = vi.fn(() => 'trace_latest_9');
vi.mock('@/src/core/run/store', () => ({
  getLatestTraceId: () => mockGetLatestTraceId(),
}));

const mockUseTraceEvents = vi.fn();
vi.mock('@/src/hooks/useTraceEvents', () => ({
  useTraceEvents: (...args: unknown[]) => mockUseTraceEvents(...args),
}));

describe('HomeLandingClientV4', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockGetLatestTraceId.mockReturnValue('trace_latest_9');
    mockUseTraceEvents.mockReturnValue({ events: [], loading: false, error: null, isLive: false, refresh: vi.fn() });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/live/tickets')) {
          return { ok: true, json: async () => ({ tickets: [{ id: 'tk1' }] }) } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            data: {
              mode: 'demo',
              generatedAt: '2026-03-01T00:00:00.000Z',
              leagues: ['NBA'],
              games: [
                {
                  id: 'g1',
                  league: 'NBA',
                  status: 'upcoming',
                  startTime: '7:00 PM',
                  matchup: 'NYK @ BOS',
                  teams: ['NYK', 'BOS'],
                  bookContext: 'demo',
                  propsPreview: [],
                  provenance: 'demo',
                  lastUpdated: '2026-03-01T00:00:00.000Z',
                },
              ],
              board: [
                { id: 'p1', gameId: 'g1', matchup: 'NYK @ BOS', player: 'Jalen Brunson', market: 'assists', line: '6.5', odds: '-115', hitRateL10: 62, riskTag: 'watch' },
                { id: 'p2', gameId: 'g1', matchup: 'NYK @ BOS', player: 'Jaylen Brown', market: 'points', line: '22.5', odds: '-108', hitRateL10: 58, riskTag: 'stable' },
              ],
            },
          }),
        } as Response;
      }),
    );
  });

  it('shows truthful demo mode chip copy', async () => {
    renderWithProviders(<HomeLandingClientV4 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: '' }} />);

    expect((await screen.findByTestId('today-mode-chip')).textContent).toContain('Demo mode (live feeds off)');
  });

  it('adds board leg into draft ticket rail', async () => {
    renderWithProviders(<HomeLandingClientV4 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: '' }} />);

    const addButton = await screen.findByRole('button', { name: /Add Jalen Brunson assists 6.5/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByLabelText('quick-slip-rail-mini')[0]?.textContent).toContain('Jalen Brunson');
    });
  });

  it('keeps Run Stress Test disabled until 2 legs and then enables with spine continuity', async () => {
    renderWithProviders(<HomeLandingClientV4 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: 'trace_123' }} />);

    const runCta = (await screen.findAllByRole('link', { name: 'Run Stress Test' }))[0];
    expect(runCta?.getAttribute('aria-disabled')).toBe('true');

    const addButtons = await screen.findAllByRole('button', { name: /Add /i });
    fireEvent.click(addButtons[0]!);
    fireEvent.click(addButtons[1]!);

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: 'Run Stress Test' });
      const href = links.map((link) => link.getAttribute('href') ?? '').find((value) => value.includes('trace_id=trace_123')) ?? '';
      expect(href).toContain('/stress-test?');
      expect(href).toContain('sport=NBA');
      expect(href).toContain('tz=America%2FNew_York');
      expect(href).toContain('date=2026-03-01');
      expect(href).toContain('mode=demo');
      expect(href).toContain('trace_id=trace_123');
    });
  });

  it('renders NervousSystemStrip dormant vs active state', async () => {
    mockGetLatestTraceId.mockReturnValue(null);
    const { rerender } = renderWithProviders(
      <HomeLandingClientV4 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: '' }} />,);

    expect((await screen.findAllByTestId('nervous-strip-dormant')).length).toBeGreaterThan(0);

    mockUseTraceEvents.mockReturnValue({
      events: [{ event_name: 'slip_persisted', created_at: new Date().toISOString(), trace_id: 'trace_2', payload: {} }],
      loading: false,
      error: null,
      isLive: true,
      refresh: vi.fn(),
    });

    rerender(<HomeLandingClientV4 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: 'trace_2' }} />);

    await waitFor(() => {
      const strip = screen.getAllByTestId('nervous-strip-active')[0];
      expect(strip?.textContent).toContain('Updated');
      expect(strip?.textContent).toMatch(/Analyze|During|After|Stage/);
    });
  });

  it('avoids direct href bypasses inside home landing v4 components', () => {
    const files = [
      'src/components/landing/HomeLandingClientV4.tsx',
      'src/components/landing/NervousSystemStrip.tsx',
      'src/components/landing/QuickSlipRailMini.tsx',
    ];

    for (const relative of files) {
      const file = path.resolve(process.cwd(), relative);
      const text = fs.readFileSync(file, 'utf8');
      const directHrefMatches = [...text.matchAll(/href=("|')\/(?!\/)/g)];
      expect(directHrefMatches.length).toBe(0);
    }
  });
});
