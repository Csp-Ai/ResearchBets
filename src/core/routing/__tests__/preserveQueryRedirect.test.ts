import { describe, expect, it } from 'vitest';

import { buildRedirectWithQuery } from '../preserveQueryRedirect';

describe('buildRedirectWithQuery', () => {
  it('preserves query params for route aliases', () => {
    expect(buildRedirectWithQuery('/stress-test', { demo: '1', x: 'y' })).toBe('/stress-test?demo=1&x=y');
  });

  it('preserves repeated query params', () => {
    expect(buildRedirectWithQuery('/stress-test', { tag: ['a', 'b'] })).toBe('/stress-test?tag=a&tag=b');
  });

  it('returns pathname when query is empty', () => {
    expect(buildRedirectWithQuery('/stress-test', undefined)).toBe('/stress-test');
  });
});
