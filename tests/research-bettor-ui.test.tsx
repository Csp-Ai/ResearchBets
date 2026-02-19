import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EmptyStateBettor, SlipActionsBar, AdvancedDrawer, VerdictHero } from '@/src/components/bettor/BettorFirstBlocks';

describe('bettor-first analyze UI blocks', () => {
  it('renders VerdictHero content when slip exists', () => {
    const html = renderToStaticMarkup(
      <VerdictHero
        confidence={68}
        weakestLeg={{ id: '1', selection: 'Luka points over', l5: 54, l10: 58, risk: 'weak' }}
        reasons={['Weakest leg is Luka points over (54% L5, 58% L10).']}
        dataQuality="Partial live"
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

  it('uses new semantic primitives instead of rb-* classnames on primary blocks', () => {
    const html = renderToStaticMarkup(
      <>
        <EmptyStateBettor onPaste={() => {}} />
        <SlipActionsBar onRemoveWeakest={() => {}} onRerun={() => {}} canTrack />
        <VerdictHero confidence={72} weakestLeg={{ id: '2', selection: 'Example leg', l5: 60, l10: 63, risk: 'strong' }} reasons={['Example reason']} dataQuality="Live stats" />
      </>
    );

    expect(html).toContain('ui-surface-card');
    expect(html).toContain('ui-button-primary');
    expect(html).toContain('ui-button-secondary');
    expect(html).toContain('ui-chip');
    expect(html).not.toContain('rb-card');
    expect(html).not.toContain('rb-btn-primary');
    expect(html).not.toContain('rb-btn-secondary');
    expect(html).not.toContain('rb-chip');
  });
});
