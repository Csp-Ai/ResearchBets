import { beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const originalWarn = console.warn;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('"scope":"provider_registry"')) {
      return;
    }
    originalWarn(...(args as Parameters<typeof console.warn>));
  });
});
