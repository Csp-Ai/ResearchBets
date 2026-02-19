import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ControlPlaneEvent } from '../src/components/AgentNodeGraph';
import { RightRailInspector } from '../src/components/terminal/RightRailInspector';
import { deriveInspectorSummary } from '../src/components/terminal/eventDerivations';

describe('RightRailInspector', () => {
  it('renders empty state when trace id is missing', () => {
    const html = renderToStaticMarkup(
      <RightRailInspector traceId={null} runId={null} sessionId={null} />
    );

    expect(html).toContain('Trust Inspector');
    expect(html).toContain('No trace selected');
  });

  it('dedupes assumptions and sources from events', () => {
    const events: ControlPlaneEvent[] = [
      {
        event_name: 'agent_scored_decision',
        trace_id: 'trace_1',
        created_at: '2026-01-01T00:00:01Z',
        payload: { assumptions: ['pace is stable'], sources: ['https://a.com'] },
      },
      {
        event_name: 'agent_scored_decision',
        trace_id: 'trace_1',
        created_at: '2026-01-01T00:00:02Z',
        payload: { assumptions: ['pace is stable', 'home edge'], sources: ['https://a.com', 'https://b.com'] },
      },
    ];

    const summary = deriveInspectorSummary(events);

    expect(summary.assumptions).toEqual(['home edge', 'pace is stable']);
    expect(summary.sources).toEqual(['https://b.com', 'https://a.com']);
  });
});
