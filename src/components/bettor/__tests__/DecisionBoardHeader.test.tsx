import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DecisionBoardHeader, verdictFromConfidence } from '../DecisionBoardHeader';

describe('DecisionBoardHeader', () => {
  it('maps confidence/risk to verdict pill', () => {
    expect(verdictFromConfidence(0.75, 'Low')).toBe('KEEP');
    expect(verdictFromConfidence(0.6, 'Medium')).toBe('MODIFY');
    expect(verdictFromConfidence(0.4, 'High')).toBe('PASS');
  });

  it('renders verdict section', () => {
    const html = renderToStaticMarkup(
      <DecisionBoardHeader
        events={[{ event_name: 'agent_scored_decision', payload: { confidence: 0.7 }, created_at: new Date().toISOString(), trace_id: 't-1' }]}
        legs={[{ selection: 'Luka points over 30.5', id: '1' }]}
        traceId="trace-1"
      />
    );

    expect(html).toContain('Decision engine');
  });
});
