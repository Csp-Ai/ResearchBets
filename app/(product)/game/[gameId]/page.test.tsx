/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import GameContextPage from '@/app/(product)/game/[gameId]/page';

describe('game page continuity CTA', () => {
  it('preserves spine and highlight when linking to control live tab', () => {
    render(
      <GameContextPage
        params={{ gameId: 'g-42' }}
        searchParams={{ sport: 'NBA', tz: 'UTC', date: '2026-02-02', mode: 'live', trace_id: 'trace-7', highlight: 'leg-9' }}
      />
    );

    const link = screen.getByRole('link', { name: 'Open full live board' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/control?');
    expect(href).toContain('tab=live');
    expect(href).toContain('highlight=leg-9');
    expect(href).toContain('gameId=g-42');
    expect(href).toContain('trace_id=trace-7');
  });
});
