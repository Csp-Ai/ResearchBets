'use client';

const IDEAS_CLIENT_CACHE_TTL_MS = 30_000;

const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export type TodayIdeasClientQuery = {
  sport: 'NFL';
  date: string;
  tz: string;
};

type TodayIdeasClientRequest = TodayIdeasClientQuery & {
  signal?: AbortSignal;
};

const requestKey = (input: TodayIdeasClientQuery) =>
  `${input.sport}:${input.date}:${input.tz}`;

const requestUrl = (input: TodayIdeasClientQuery) => {
  const params = new URLSearchParams({
    sport: input.sport,
    date: input.date,
    tz: input.tz,
  });
  return `/api/ideas/today?${params.toString()}`;
};

const callerAbortError = () => new DOMException('The operation was aborted.', 'AbortError');

function waitForCaller<T>(shared: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return shared;
  if (signal.aborted) return Promise.reject(callerAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(callerAbortError());
    signal.addEventListener('abort', onAbort, { once: true });

    shared.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function getSharedRequest(input: TodayIdeasClientQuery): Promise<unknown> {
  const key = requestKey(input);
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }

  const inFlight = inFlightRequests.get(key);
  if (inFlight) return inFlight;

  const request = fetch(requestUrl(input))
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error('ideas_unavailable');
      responseCache.set(key, {
        expiresAt: Date.now() + IDEAS_CLIENT_CACHE_TTL_MS,
        data: body,
      });
      return body;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}

export function fetchTodayIdeasShared<T>(input: TodayIdeasClientRequest): Promise<T> {
  const { signal, ...query } = input;
  return waitForCaller(getSharedRequest(query) as Promise<T>, signal);
}

export function resetTodayIdeasClientForTests(): void {
  responseCache.clear();
  inFlightRequests.clear();
}
