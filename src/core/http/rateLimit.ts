import { NextResponse } from 'next/server';

type Bucket = {
  windowStartMs: number;
  count: number;
};

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

const prune = (now: number) => {
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStartMs > WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
};

export const getRequestIp = (request: Request): string => {
  const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return xff;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
};

export const applyRateLimit = (
  request: Request,
  options: { route: string; limit: number }
): NextResponse | null => {
  const now = Date.now();
  const ip = getRequestIp(request);
  const bucketKey = `${options.route}:${ip}`;
  const current = buckets.get(bucketKey);

  prune(now);

  if (!current || now - current.windowStartMs >= WINDOW_MS) {
    buckets.set(bucketKey, { windowStartMs: now, count: 1 });
    return null;
  }

  current.count += 1;
  if (current.count <= options.limit) {
    buckets.set(bucketKey, current);
    return null;
  }

  return NextResponse.json(
    { error: 'Too many requests right now. Please wait a minute and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    }
  );
};
