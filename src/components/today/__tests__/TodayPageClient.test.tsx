/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import type { TodayPayload } from '@/src/core/today/types';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

import { TodayPageClient } from '../TodayPageClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('TodayPageClient', () => {
  const payload: TodayPayload = {
    mode: 'demo',
    generatedAt: '2026-02-26T18:00:00.000Z',
    leagues: ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'],
    games: [{ id: 'nba-live-1', league: 'NBA', status: 'live', startTime: '19:00 ET', matchup: 'LAL @ DAL', teams: ['LAL', 'DAL'], bookContext: 'Unified board resolver', provenance: 'deterministic fallback', lastUpdated: '2026-02-26T18:00:00.000Z', propsPreview: [] }],
    board: [
      { id: 'scout-1', gameId: 'nba-live-1', player: 'Luka Doncic', market: 'pra', line: '45.5', odds: '-112', hitRateL10: 72, marketImpliedProb: 0.55, modelProb: 0.63, edgeDelta: 0.08, riskTag: 'stable', matchup: 'LAL @ DAL', startTime: '19:00 ET', mode: 'demo', l5Avg: 46.2, l5Source: 'live', minutesL3Avg: 35.1, minutesSource: 'live', roleConfidence: 'high', roleReasons: ['Stable rotation minutes L3'], deadLegRisk: 'low', deadLegReasons: ['Role volatility'] },
      { id: 'scout-2', gameId: 'nba-live-1', player: 'Role Volatile', market: 'threes', line: '2.5', odds: '+210', hitRateL10: 45, marketImpliedProb: 0.31, modelProb: 0.33, edgeDelta: 0.02, riskTag: 'watch', matchup: 'LAL @ DAL', startTime: '19:00 ET', mode: 'demo', l5Avg: 1.2, l5Source: 'heuristic', minutesL3Avg: 18.1, minutesSource: 'heuristic', threesAttL5Avg: 2.9, attemptsSource: 'heuristic', roleConfidence: 'low', roleReasons: ['Low minutes L3'], deadLegRisk: 'high', deadLegReasons: ['Low-attempt risk (heuristic)'] }
    ]
  };

  it('renders core candidates grouped categories with PRA first and keeps all props table', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);

    const labels = screen.getAllByTestId(/category-/).map((el) => el.textContent);
    expect(labels).toEqual(['PRA', '3PM']);

    expect(screen.getByRole('button', { name: 'Core candidates' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All props' }));
    expect(screen.getByTestId('sort-select')).toBeTruthy();
  });

  it('renders decision-focused row copy with why-on-board context', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);
    expect(screen.getAllByText(/Why on board:/i).length).toBeGreaterThan(0);
  });

  it('renders role/dead-leg chips with source labels', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);
    expect(screen.getAllByText(/L5 46.2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MIN L3 35.1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Risk high/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3PA L5 2.9/i).length).toBeGreaterThan(0);
  });

  it('shows fallback-limited source quality for demo board payloads', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);
    expect(screen.getAllByText(/Demo mode \(live feeds off\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sources: demo fallback/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Freshness: Demo snapshot/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fallback context/i).length).toBeGreaterThan(0);
  });

  it('renders ranked decision-tier row cues and carries board rationale into staging', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);

    expect(screen.getAllByText(/ranked/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Priority look|Viable look|Thin look/i).length).toBeGreaterThan(0);

    const addButton = screen.getAllByRole('button', { name: 'Add' })[0];
    if (!addButton) throw new Error('Expected at least one Add button');
    fireEvent.click(addButton);
    expect(screen.getByText(/Board reason:/i)).toBeTruthy();
    expect(screen.getByText(/Staging keeps each leg tied to its board rationale./i)).toBeTruthy();
  });

});
