/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

describe('cockpit route client', () => {
  it('renders core cockpit sections', () => {
    renderWithProviders(<CockpitLandingClient />);

    expect(screen.getByText('One leg breaks.')).toBeTruthy();
    expect(screen.getByText("Tonight's Board")).toBeTruthy();
    expect(screen.getByText('Draft Ticket')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run Stress Test' })).toBeTruthy();
  });
});
