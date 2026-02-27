import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DiscoverPage from '../page';

describe('discover page', () => {
  it('does not redirect and renders scout headings', () => {
    const html = renderToStaticMarkup(<DiscoverPage />);
    expect(html).toContain('Discover');
    expect(html).toContain('Scout → Draft');
  });

  it('renders CTA row labels', () => {
    const html = renderToStaticMarkup(<DiscoverPage />);
    expect(html).toContain('Track slip');
    expect(html).toContain('Stress-test');
    expect(html).toContain('Open Tonight');
  });
});
