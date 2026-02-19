import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LegTable, removeLegAtIndex } from '../src/components/bettor/LegTable';

describe('LegTable', () => {
  it('renders rows for provided legs', () => {
    const html = renderToStaticMarkup(
      <LegTable
        traceId="trace_1"
        legs={[
          { selection: 'Lakers -4.5', odds: '-110' },
          { selection: 'Celtics ML', odds: '-120' }
        ]}
        events={[]}
        onLegsChange={() => {}}
      />
    );

    expect(html).toContain('Lakers -4.5');
    expect(html).toContain('Celtics ML');
  });

  it('remove helper updates rows', () => {
    const remaining = removeLegAtIndex(
      [
        { selection: 'Leg A', odds: '-110' },
        { selection: 'Leg B', odds: '-120' }
      ],
      0
    );

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.selection).toBe('Leg B');
  });
});
