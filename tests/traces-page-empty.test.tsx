import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TracesIndexContent } from '../src/components/terminal/TracesIndexContent';

describe('TracesIndexPage', () => {
  it('renders empty state before trace id input', () => {
    const html = renderToStaticMarkup(<TracesIndexContent />);

    expect(html).toContain('No trace selected');
    expect(html).toContain('Open trace');
  });
});
