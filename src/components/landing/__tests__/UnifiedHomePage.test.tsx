import { describe, expect, it, vi } from 'vitest';

describe('Unified home landing', () => {
  it('renders / without server redirect', async () => {
    const redirect = vi.fn();

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/page');

    expect(() => mod.default()).not.toThrow();
    expect(redirect).not.toHaveBeenCalled();
  });
});
