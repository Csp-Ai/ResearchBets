import { describe, expect, it } from 'vitest';

describe('Unified home landing', () => {
  it('renders the canonical shared landing component at /', async () => {
    const mod = await import('@/app/page');
    const element = mod.default({ searchParams: { trace_id: 'trace-home' } }) as { type?: { name?: string }, props?: { searchParams?: { trace_id?: string } } };

    expect(element.type?.name).toBe('CanonicalLanding');
    expect(element.props?.searchParams?.trace_id).toBe('trace-home');
  });
});
