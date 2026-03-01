/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';
import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: [], addLeg: vi.fn(), removeLeg: vi.fn(), getSlip: vi.fn(), updateLeg: vi.fn(), setSlip: vi.fn(), clearSlip: vi.fn() })
}));

describe('frontdoor proof-first', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't1', data: { mode: 'demo', status: 'market_closed', games: [], board: [] } }) })));
  });

  it('does not show quiet/no-slates primary copy and still renders board rows', async () => {
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('board-section')).toBeTruthy());
    expect(screen.queryByText(/Markets are currently quiet/i)).toBeNull();
    expect(screen.queryByText(/No upcoming slates posted yet/i)).toBeNull();
    const addButtons = screen.getAllByRole('button', { name: /add|added/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(6);
    expect(document.body.textContent).not.toMatch(/provider_unavailable/i);
    expect(document.body.textContent).not.toMatch(/trace_id:/i);
    expect(document.body.textContent).not.toMatch(/unknown leg/i);
    expect(document.body.textContent).not.toMatch(/trace inspector|developer mode/i);
  });
});
