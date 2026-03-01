/** @vitest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import HomeLandingClientV2 from '@/src/components/landing/HomeLandingClientV2';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('@/src/core/run/store', () => ({
  getLatestTraceId: () => 'trace_latest_9'
}));

describe('HomeLandingClientV2', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({
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
              lastUpdated: '2026-03-01T00:00:00.000Z'
            }
          ],
          board: [
            { id: 'p1', gameId: 'g1', matchup: 'NYK @ BOS', player: 'Jalen Brunson', market: 'assists', line: '6.5', odds: '-115', hitRateL10: 62, riskTag: 'watch' },
            { id: 'p2', gameId: 'g1', matchup: 'NYK @ BOS', player: 'Jaylen Brown', market: 'points', line: '22.5', odds: '-108', hitRateL10: 58, riskTag: 'stable' }
          ]
        }
      })
    })));
  });

  it('shows truthful demo mode copy', async () => {
    renderWithProviders(<HomeLandingClientV2 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: '' }} />);

    expect((await screen.findByTestId('today-mode-chip')).textContent).toContain('Demo mode (live feeds off)');
  });

  it('adds board leg into the quick slip rail', async () => {
    renderWithProviders(<HomeLandingClientV2 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: '' }} />);

    const addButtons = await screen.findAllByRole('button', { name: 'Add' });
    fireEvent.click(addButtons[0]!);

    await waitFor(() => {
      const rails = screen.getAllByLabelText('quick-slip-rail-mini');
      expect(rails[0]?.textContent).toContain('Jalen Brunson');
      expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBeGreaterThan(0);
    });
  });

  it('builds Run Stress Test href with spine keys and trace_id continuity', async () => {
    renderWithProviders(<HomeLandingClientV2 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: 'trace_123' }} />);

    const runLinks = await screen.findAllByRole('link', { name: 'Run Stress Test' });
    const href = runLinks.map((link) => link.getAttribute('href') ?? '').find((value) => value.includes('trace_id=trace_123')) ?? '';

    expect(href).toContain('/stress-test?');
    expect(href).toContain('sport=NBA');
    expect(href).toContain('tz=America%2FNew_York');
    expect(href).toContain('date=2026-03-01');
    expect(href).toContain('mode=demo');
    expect(href).toContain('trace_id=trace_123');
  });

  it('renders collapsed DURING and AFTER previews and expands them', async () => {
    renderWithProviders(<HomeLandingClientV2 spine={{ sport: 'NBA', tz: 'America/New_York', date: '2026-03-01', mode: 'demo', trace_id: '' }} />);

    const duringSummaries = await screen.findAllByText(/DURING/);
    const afterSummaries = screen.getAllByText(/AFTER preview/);

    fireEvent.click(duringSummaries[0]!);
    fireEvent.click(afterSummaries[0]!);

    expect((await screen.findAllByText('3/8 assists')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Weakest leg missed by 1/).length).toBeGreaterThan(0);
  });

  it('avoids direct href bypasses inside home landing v2 component', () => {
    const file = path.resolve(process.cwd(), 'src/components/landing/HomeLandingClientV2.tsx');
    const text = fs.readFileSync(file, 'utf8');
    const directHrefMatches = [...text.matchAll(/href=(["'])\/(?!\/)/g)];
    expect(directHrefMatches.length).toBe(0);
  });
});
