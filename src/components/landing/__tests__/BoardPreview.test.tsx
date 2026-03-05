/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/src/core/today/service.server', () => ({
  resolveTodayTruth: vi.fn(async () => ({
    mode: 'demo', generatedAt: '2026-01-01', leagues: ['NBA'], reason: 'demo_requested',
    games: [
      { id: 'g1', league: 'NBA', status: 'upcoming', startTime: '7:00 PM', matchup: 'A @ B', teams: ['A', 'B'], bookContext: 'x', propsPreview: [], provenance: 'demo', lastUpdated: '2026-01-01' },
      { id: 'g2', league: 'NBA', status: 'upcoming', startTime: '8:00 PM', matchup: 'C @ D', teams: ['C', 'D'], bookContext: 'x', propsPreview: [], provenance: 'demo', lastUpdated: '2026-01-01' }
    ],
    board: Array.from({ length: 8 }).map((_, i) => ({ id: `p${i}`, gameId: i < 4 ? 'g1' : 'g2', player: `P${i}`, market: 'pra', line: '30.5', odds: '-110', minutesL3Avg: 30, minutesSource: 'heuristic', l5Avg: 29, l5Source: 'heuristic', deadLegRisk: 'med', deadLegReasons: ['Role volatility'] }))
  }))
}));

import { BoardPreviewServer } from '../BoardPreview.server';

describe('BoardPreviewServer', () => {
  it('renders PRA first and caps rows per bucket', async () => {
    const el = await BoardPreviewServer({ searchParams: {} });
    render(el);
    const labels = screen.getAllByText(/PRA|PTS|REB|AST|3PM/).map((n) => n.textContent);
    expect(labels[0]).toBe('PRA');
    expect(screen.getAllByText(/Role volatility/).length).toBeLessThanOrEqual(4);
    expect(screen.getAllByText(/heuristic/).length).toBeGreaterThan(0);
  });
});
