// @vitest-environment jsdom

import fs from 'node:fs';
import path from 'node:path';
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


  it('defines semantic design tokens used by the rendered page', () => {
    render(<ResearchPageContent />);

    const globalsCss = fs.readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

    expect(globalsCss).toContain('--background:');
    expect(globalsCss).toContain('--card:');
    expect(globalsCss).toContain('.dark {');
  });

  it('uses upgraded advanced label copy', () => {
    render(<ResearchPageContent />);
    expect(screen.getAllByText('Run details (optional)').length).toBeGreaterThan(0);
  });

  it('routes Try an example to ingest with prefilled slip', () => {
    render(<ResearchPageContent />);

    const tryExampleButtons = screen.getAllByText('Try an example');
    const firstTryExampleButton = tryExampleButtons[0];

    expect(firstTryExampleButton).toBeDefined();

    fireEvent.click(firstTryExampleButton as HTMLElement);

    expect(push).toHaveBeenCalledTimes(1);
    const firstPushCall = push.mock.calls[0];

    expect(firstPushCall).toBeDefined();
    expect(firstPushCall?.[0]).toContain('/ingest?');
    expect(firstPushCall?.[0]).toContain('prefill=Jayson+Tatum+over+29.5+points');
  });
});
