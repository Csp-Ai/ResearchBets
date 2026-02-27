// @vitest-environment jsdom

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ResearchPageContent from '@/src/components/research/ResearchPageContent';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

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

  it('renders stress-test research shell without crashing', () => {
    renderWithProviders(<ResearchPageContent />);
    expect(screen.getAllByText('Stress Test').length).toBeGreaterThan(0);
  });

  it('defines semantic design tokens used by the rendered page', () => {
    const globalsCss = fs.readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

    expect(globalsCss).toContain('--background:');
    expect(globalsCss).toContain('--card:');
    expect(globalsCss).toContain('--border:');
    expect(globalsCss).toContain('--ring:');
    expect(globalsCss).toContain('--tone-strong-bg:');
    expect(globalsCss).toContain('--tone-caution-bg:');
    expect(globalsCss).toContain('--tone-weak-bg:');
    expect(globalsCss).toContain('.dark {');
  });


  it('shows Open latest run CTA in empty analyze state using trace_id param', async () => {
    window.localStorage.setItem('rb:runs:v1', JSON.stringify([
      {
        trace_id: 'latest-research-trace',
        updatedAt: '2026-02-27T10:00:00.000Z',
        status: 'complete',
        slipText: '',
        extractedLegs: [],
        enrichedLegs: [],
        analysis: { confidencePct: 51, weakestLegId: null, reasons: ['stable'], riskLabel: 'Caution', computedAt: '2026-02-27T10:00:00.000Z' }
      }
    ]));

    renderWithProviders(<ResearchPageContent />);
    const link = await screen.findByRole('link', { name: 'Open latest run' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('trace_id=latest-research-trace');
    expect(href).not.toContain('trace=latest-research-trace');
  });

  it('keeps structural smoke expectations stable', () => {
    renderWithProviders(<ResearchPageContent />);
    expect(screen.getAllByText('Stress Test').length).toBeGreaterThan(0);
  });

  it('keeps router idle without explicit CTA interaction', () => {
    renderWithProviders(<ResearchPageContent />);
    expect(push).toHaveBeenCalledTimes(0);
  });
});
