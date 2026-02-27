import { appendQuery } from '@/src/components/landing/navigation';

type NervousLike = {
  sport?: string;
  date?: string;
  tz?: string;
  mode?: string;
  toHref: (path: string, overrides?: Record<string, string | number | undefined>) => string;
};

export function buildShareRunHref(nervous: NervousLike, traceId?: string | null): string | null {
  if (!traceId) return null;
  const trimmed = traceId.trim();
  if (!trimmed) return null;
  return appendQuery(nervous.toHref('/stress-test'), {
    trace_id: trimmed,
    tab: 'analyze',
    sport: nervous.sport,
    date: nervous.date,
    tz: nervous.tz,
    mode: nervous.mode
  });
}
