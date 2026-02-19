import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DecisionBoardHeader } from '../../../src/components/bettor/DecisionBoardHeader';
import { LegTable } from '../../../src/components/bettor/LegTable';

describe('Snapshot render', () => {
  it('renders integrated decision snapshot blocks', () => {
    const html = renderToStaticMarkup(
      <div>
        <DecisionBoardHeader
          events={[{ event_name: 'agent_scored_decision', payload: { confidence: 0.7, rationale: 'Strong form' }, created_at: new Date().toISOString(), trace_id: 't-1' }]}
          legs={[{ id: '1', selection: 'Luka points over 30.5' }]}
        />
        <LegTable
          legs={[{ selection: 'Luka points over 30.5', id: '1' }]}
          events={[]}
          onLegsChange={() => undefined}
        />
      </div>
    );

    expect(html).toContain('Decision engine');
    expect(html).toContain('Ranked leg table');
  });
});
