import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AdvancedDrawer, VerdictHero } from '@/src/components/bettor/BettorFirstBlocks';

describe('bettor-first analyze UI blocks', () => {
  it('renders VerdictHero content when slip exists', () => {
    const html = renderToStaticMarkup(
      <VerdictHero
        confidence={68}
        weakestLeg={{ id: '1', selection: 'Luka points over', l5: 54, l10: 58, risk: 'weak' }}
        reasons={['Weakest leg is Luka points over (54% L5, 58% L10).']}
      />
    );

    expect(html).toContain('Verdict');
    expect(html).toContain('68%');
    expect(html).toContain('Luka points over');
  });

  it('keeps advanced drawer collapsed by default', () => {
    const html = renderToStaticMarkup(<AdvancedDrawer developerMode={false}><p>Hidden stuff</p></AdvancedDrawer>);
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
  });

  it('hides and shows trace link based on developer mode', () => {
    const hidden = renderToStaticMarkup(<AdvancedDrawer developerMode={false}><p>x</p></AdvancedDrawer>);
    const shown = renderToStaticMarkup(<AdvancedDrawer developerMode><p>x</p></AdvancedDrawer>);

    expect(hidden).not.toContain('Open run details');
    expect(shown).toContain('Open run details');
  });
});
