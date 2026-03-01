import { describe, expect, it, vi } from 'vitest';

describe('Unified home landing', () => {
  it('redirects / to /cockpit', async () => {
    const redirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/page');

    expect(() => mod.default({})).toThrow('REDIRECT:/cockpit?sport=NBA&tz=America%2FPhoenix&date=');
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('/cockpit?'));
  });
});
