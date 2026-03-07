import { describe, expect, it } from 'vitest';

import { listPrimaryCanonicalRoutes, listSecondaryRoutes, routeReadinessLabel } from '@/src/core/nervous/routeReadiness';

describe('route readiness registry', () => {
  it('keeps canonical bettor loop in primary nav', () => {
    expect(listPrimaryCanonicalRoutes().map((route) => route.href)).toEqual(['/today', '/slip', '/stress-test', '/track', '/review']);
  });

  it('marks secondary surfaces separately from canonical routes', () => {
    const secondary = listSecondaryRoutes();
    expect(secondary.some((route) => route.href === '/control')).toBe(true);
    expect(secondary.every((route) => routeReadinessLabel(route.readiness) === 'Secondary')).toBe(true);
  });
});
