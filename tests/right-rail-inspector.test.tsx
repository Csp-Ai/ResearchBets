import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RightRailInspector } from '../src/components/terminal/RightRailInspector';

describe('RightRailInspector', () => {
  it('renders empty state when trace id is missing', () => {
    const html = renderToStaticMarkup(
      <RightRailInspector traceId={null} runId={null} sessionId={null} />
    );

    expect(html).toContain('Trust Inspector');
    expect(html).toContain('No trace selected');
  });
});
