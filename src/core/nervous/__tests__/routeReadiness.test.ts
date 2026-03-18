import { describe, expect, it } from 'vitest';

import { listPrimaryCanonicalRoutes, listProductRoutes, routeReadinessLabel } from '@/src/core/nervous/routeReadiness';

describe('route readiness registry', () => {
  it('keeps canonical bettor loop in primary nav', () => {
    expect(listPrimaryCanonicalRoutes().map((route) => route.href)).toEqual(['/today', '/slip', '/stress-test', '/track', '/review']);
  });

  it('marks redirect-only and dev-only surfaces separately from canonical routes', () => {
    const routes = listProductRoutes();
    expect(routes.find((route) => route.href === '/research')?.readiness).toBe('redirect-only');
    expect(routes.find((route) => route.href === '/control')?.readiness).toBe('dev-only');
    expect(routeReadinessLabel('redirect-only')).toBe('Redirect-only');
    expect(routeReadinessLabel('dev-only')).toBe('Dev-only');
  });
});
