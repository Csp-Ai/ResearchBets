// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ResearchPageContent } from '@/app/research/page';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('/research render polish', () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
  });

  it('shows empty-state support sections so the page stays useful', () => {
    render(<ResearchPageContent />);

    expect(screen.getByText('Try an example')).toBeTruthy();
    expect(screen.getByTestId('research-empty-state')).toBeTruthy();
    expect(screen.getByTestId('recent-activity-panel')).toBeTruthy();
    expect(screen.getByText('No recent runs yet.')).toBeTruthy();
    expect(screen.getByTestId('how-it-works')).toBeTruthy();
  });

  it('uses upgraded advanced label copy', () => {
    render(<ResearchPageContent />);
    expect(screen.getAllByText('Run details (optional)').length).toBeGreaterThan(0);
  });

  it('routes Try an example to ingest with prefilled slip', () => {
    render(<ResearchPageContent />);

    fireEvent.click(screen.getAllByText('Try an example')[0]);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toContain('/ingest?');
    expect(push.mock.calls[0][0]).toContain('prefill=Jayson+Tatum+over+29.5+points');
  });
});
