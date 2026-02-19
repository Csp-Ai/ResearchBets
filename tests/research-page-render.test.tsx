// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResearchPageContent } from '@/app/research/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('/research render polish', () => {
  it('shows Try an example and keeps a single primary hero container in empty state', () => {
    const { container } = render(<ResearchPageContent />);

    expect(screen.getByText('Try an example')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="research-primary-hero"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="research-empty-state"]')).toBeTruthy();
    expect(container.firstChild).toMatchSnapshot();
  });
});
