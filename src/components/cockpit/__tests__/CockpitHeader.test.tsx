/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { CockpitHeader } from '@/src/components/cockpit/CockpitHeader';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

describe('CockpitHeader', () => {
  it('renders shared chrome content', () => {
    renderWithNervousSystem(
      <CockpitHeader title="Stress Test" purpose="Purpose" strip={{ mode: 'demo' }} ctas={<button type="button">Action</button>} />
    );
    expect(screen.getByText('Stress Test')).toBeTruthy();
    expect(screen.getByText('Purpose')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Runtime')).toBeTruthy();
  });
});
