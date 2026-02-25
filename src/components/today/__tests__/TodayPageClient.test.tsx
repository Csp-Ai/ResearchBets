/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TodayPageClient } from '../TodayPageClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('TodayPageClient', () => {
  it('renders demo slate sections', () => {
    render(<TodayPageClient />);

    expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
    expect(screen.getByText('Live now')).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });
});
