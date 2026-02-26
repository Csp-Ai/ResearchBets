/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TrackerLite } from '../TrackerLite';

describe('TrackerLite', () => {
  it('renders trace id and steps', () => {
    render(
      <TrackerLite
        visible
        running
        traceId="trace_demo_123"
        steps={[
          { label: 'Parse', state: 'done' },
          { label: 'Injuries', state: 'running' },
          { label: 'Lines/Odds', state: 'queued' },
          { label: 'Overlap/Correlation', state: 'queued' },
          { label: 'Verdict', state: 'queued' }
        ]}
        events={[{ id: '1', label: 'parse_complete · demo' }]}
      />
    );

    expect(screen.getByText(/trace_id: trace_demo_123/)).toBeTruthy();
    expect(screen.getByText('Parse')).toBeTruthy();
    expect(screen.getByText('Verdict')).toBeTruthy();
  });
});
