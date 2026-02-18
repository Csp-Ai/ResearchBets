import { describe, expect, it } from 'vitest';

import { buildInsights } from '../src/core/persistence/dashboard';
import { isPolicyCompliant } from '../src/core/policy/text';

describe('dashboard policy copy', () => {
  it('does not emit recommendation language', () => {
    const insights = buildInsights([]);
    insights.forEach((insight) => expect(isPolicyCompliant(insight)).toBe(true));
  });
});
