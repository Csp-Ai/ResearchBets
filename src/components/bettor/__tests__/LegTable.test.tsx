import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LegTable, removeLegAtIndex } from '../LegTable';

describe('LegTable', () => {
  it('removes selected leg', () => {
    expect(removeLegAtIndex([{ selection: 'A' }, { selection: 'B' }], 0)).toEqual([{ selection: 'B' }]);
  });

  it('renders signal chips', () => {
    const html = renderToStaticMarkup(
      <LegTable
        legs={[{ selection: 'Luka points over 30.5', id: '1' }, { selection: 'Kyrie assists over 5.5', id: '2' }]}
        events={[{ event_name: 'injury_update', payload: { agent_id: 'injury' }, created_at: new Date().toISOString(), trace_id: 't-1' }]}
        traceId="trace-2"
        onLegsChange={() => undefined}
      />
    );

    expect(html).toContain('Evidence');
    expect(html).toContain('Volatility');
  });
});
