/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RunStatusPill } from '@/src/components/trace/RunStatusPill';

describe('run status copy', () => {
  it('does not render waiting-for-events dead air copy', () => {
    render(<RunStatusPill mode="demo" generatedAt={new Date().toISOString()} traceId="trace-1" />);
    expect(screen.queryByText(/Waiting for events/i)).toBeNull();
  });

  it('cache mode uses cache label not live mode', () => {
    render(<RunStatusPill mode="cache" generatedAt={new Date().toISOString()} traceId="trace-1" />);
    expect(screen.getAllByText(/Cache/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Live mode/i)).toBeNull();
  });
});
