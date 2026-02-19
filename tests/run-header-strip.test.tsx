import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RunHeaderStrip } from '../src/components/terminal/RunHeaderStrip';

describe('RunHeaderStrip', () => {
  it('renders trace badge and counters when trace is provided', () => {
    const html = renderToStaticMarkup(
      <RunHeaderStrip
        traceId="trace_test_123"
        events={[
          { event_name: 'agent_invocation_started', trace_id: 'trace_test_123', created_at: '2026-01-01T00:00:00Z', payload: { agent_id: 'alpha' } },
        ]}
      />
    );

    expect(html).toContain('trace:trace_test_1');
    expect(html).toContain('events 1');
    expect(html).toContain('agents 1');
  });
});
