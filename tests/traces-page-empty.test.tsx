import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TracesIndexContent } from '../src/components/terminal/TracesIndexContent';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push }),
}));

describe('TracesIndexPage', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('renders empty state before trace id input', () => {
    const html = renderToStaticMarkup(<TracesIndexContent />);

    expect(html).toContain('No trace selected');
    expect(html).toContain('Open trace');
  });

  it('renders recent traces section', () => {
    const html = renderToStaticMarkup(<TracesIndexContent />);
    expect(html).toContain('Recent traces');
  });
});
