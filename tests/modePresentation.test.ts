import { describe, expect, it } from 'vitest';

import { getModePresentation } from '@/src/core/mode/policy';

describe('mode presentation copy', () => {
  it('uses neutral truthful copy for all modes', () => {
    const modes: Array<'live' | 'cache' | 'demo'> = ['live', 'cache', 'demo'];

    modes.forEach((mode) => {
      const presentation = getModePresentation(mode);
      expect(presentation.label.toLowerCase()).not.toMatch(/error|fail|panic|broken/);
      expect(presentation.tooltip.toLowerCase()).not.toMatch(/error|fail|panic|broken/);
    });
  });

  it('keeps deterministic demo statement', () => {
    const demo = getModePresentation('demo');
    expect(demo.label).toContain('Demo mode (live feeds off)');
    expect(demo.tooltip).toContain('deterministic demo board');
  });
});
