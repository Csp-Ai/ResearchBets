import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SlipVerdictCard } from '../src/components/bettor/SlipVerdictCard';

describe('SlipVerdictCard', () => {
  it('renders empty state when no legs or events', () => {
    const html = renderToStaticMarkup(<SlipVerdictCard events={[]} legs={[]} />);
    expect(html).toContain('Run research to generate a verdict');
  });

  it('renders rating and confidence from mocked events', () => {
    const html = renderToStaticMarkup(
      <SlipVerdictCard
        legs={[{ selection: 'Lakers -4.5', odds: '-110' }]}
        events={[
          {
            event_name: 'agent_scored_decision',
            trace_id: 'trace_a',
            created_at: '2026-01-01T00:00:00Z',
            payload: { confidence: 0.86, rationale: 'Line value holds', sources: ['injury report'] }
          }
        ]}
      />
    );

    expect(html).toContain('Overall rating');
    expect(html).toContain('86%');
  });
});
