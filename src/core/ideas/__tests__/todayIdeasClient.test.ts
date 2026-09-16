import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchTodayIdeasShared,
  resetTodayIdeasClientForTests,
} from '@/src/core/ideas/todayIdeasClient';

const query = {
  sport: 'NFL' as const,
  date: '2026-09-14',
  tz: 'America/Phoenix',
};

const okResponse = (body: unknown) => ({
  ok: true,
  json: async () => body,
}) as Response;

describe('shared today ideas client', () => {
  beforeEach(() => {
    resetTodayIdeasClientForTests();
    vi.restoreAllMocks();
  });

  it('dedupes concurrent requests for the same sport/date/timezone', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal('fetch', fetchMock);

    const first = fetchTodayIdeasShared<{ ok: boolean }>({ ...query });
    const second = fetchTodayIdeasShared<{ ok: boolean }>({ ...query });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveResponse?.(okResponse({ ok: true }));

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
  });

  it('does not cancel the shared request when one consumer aborts', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const abortedConsumer = fetchTodayIdeasShared<{ ok: boolean }>({
      ...query,
      signal: controller.signal,
    });
    const survivingConsumer = fetchTodayIdeasShared<{ ok: boolean }>({ ...query });

    controller.abort();
    await expect(abortedConsumer).rejects.toMatchObject({ name: 'AbortError' });

    resolveResponse?.(okResponse({ ok: true }));
    await expect(survivingConsumer).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses a successful response inside the client cache window', async () => {
    const fetchMock = vi.fn(async () => okResponse({ ok: true, data: { ideas: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchTodayIdeasShared({ ...query });
    const second = await fetchTodayIdeasShared({ ...query });

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
