/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { NervousSystemProvider, useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

function Probe() {
  const nervous = useNervousSystem();
  return <div data-testid="probe">{`${nervous.sport}|${nervous.mode}|${nervous.trace_id ?? 'none'}`}</div>;
}

describe('NervousSystemProvider', () => {
  it('hydrates initial spine for canonical landing continuity', () => {
    window.history.replaceState({}, '', '/?sport=NBA&mode=demo');
    render(
      <NervousSystemProvider initialSpine={{ sport: 'NFL', mode: 'live', trace_id: 'trace-entry-1' }}>
        <Probe />
      </NervousSystemProvider>
    );

    expect(screen.getByTestId('probe').textContent).toBe('NFL|live|trace-entry-1');
  });
});
