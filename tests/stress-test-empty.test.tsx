// @vitest-environment jsdom

import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { XRayVisualDetails } from '@/src/components/xray/XRayVisualDetails';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

describe('empty Ticket X-Ray', () => {
  it('shows the bettor a direct ticket entry path instead of collapsed internals', async () => {
    window.localStorage.clear();
    renderWithProviders(<XRayVisualDetails />);

    expect(await screen.findByRole('heading', { name: 'Give me a ticket to dissect.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Scan / paste slip' })).toBeTruthy();
    expect(screen.queryByText('Visual dependency map')).toBeNull();
  });
});
