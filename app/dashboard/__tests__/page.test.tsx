import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DashboardPage from '../page';

describe('dashboard page', () => {
  it('does not redirect and renders dashboard heading', () => {
    const html = renderToStaticMarkup(<DashboardPage />);
    expect(html).toContain('Dashboard');
    expect(html).toContain('Truth Loop');
  });
});
