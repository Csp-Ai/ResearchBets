import { describe, expect, it, vi } from 'vitest';

describe('Unified home landing', () => {
  it('redirects / to canonical cockpit entry', async () => {
    const redirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/(home)/page');

    expect(() => mod.default({ searchParams: { mode: 'demo', source: 'home' } })).toThrow('REDIRECT:/cockpit?');
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('mode=demo'));
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('source=home'));
  });
});
