/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import CommunityPage from './page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

vi.mock('@/src/components/bettor-os/FeedCard', () => ({
  FeedCard: ({ onCloned }: { onCloned: (postId: string, legs: Array<{ text: string }>) => void }) => (
    <button type="button" onClick={() => onCloned('post-1', [{ text: 'J. Brunson over 24.5 points' }])}>Clone</button>
  )
}));

describe('CommunityPage routing continuity', () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ posts: [{ id: 'post-1' }] })
    }) as Response));
  });

  it('preserves spine params when cloning into stress-test', async () => {
    renderWithProviders(<CommunityPage />, { sport: 'NBA', tz: 'America/New_York', date: '2026-01-01', mode: 'demo' });
    await screen.findByRole('button', { name: 'Clone' });

    fireEvent.click(screen.getByRole('button', { name: 'Clone' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(expect.stringContaining('/stress-test?'));
      expect(push).toHaveBeenCalledWith(expect.stringContaining('sport=NBA'));
      expect(push).toHaveBeenCalledWith(expect.stringContaining('prefill=J.+Brunson+over+24.5+points'));
    });
  });
});
