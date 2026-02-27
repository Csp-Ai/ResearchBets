import React from 'react';

import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

export { renderWithNervousSystem as renderWithProviders };

export type RenderWithProvidersOptions = Parameters<typeof renderWithNervousSystem>[1];

export function renderWithDefaultProviders(ui: React.ReactElement, options?: RenderWithProvidersOptions) {
  return renderWithNervousSystem(ui, options);
}
