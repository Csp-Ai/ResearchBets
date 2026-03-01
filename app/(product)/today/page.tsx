import { headers } from 'next/headers';

import { TodayPageClient } from '@/src/components/today/TodayPageClient';
import { normalizeSpine } from '@/src/core/nervous/spine';
import { toHref } from '@/src/core/nervous/routes';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload } from '@/src/core/today/types';

type TodayPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const readFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const spine = normalizeSpine({
    sport: readFirst(searchParams?.sport),
    date: readFirst(searchParams?.date),
    tz: readFirst(searchParams?.tz),
    mode: readFirst(searchParams?.mode),
    trace_id: readFirst(searchParams?.trace_id),
    tab: readFirst(searchParams?.tab)
  });

  let initialPayload = createDemoTodayPayload();

  try {
    const incomingHeaders = await headers();
    const requestHeaders = new Headers();
    for (const [key, value] of incomingHeaders.entries()) {
      if (key.toLowerCase() === 'cookie' || key.toLowerCase() === 'authorization') {
        requestHeaders.set(key, value);
      }
    }

    const host = incomingHeaders.get('x-forwarded-host') ?? incomingHeaders.get('host') ?? 'localhost:3000';
    const proto = incomingHeaders.get('x-forwarded-proto') ?? 'http';
    const response = await fetch(`${proto}://${host}${toHref('/api/today', spine)}`, {
      cache: 'no-store',
      headers: requestHeaders
    });

    if (response.ok) {
      const payload = await response.json() as { ok?: boolean; data?: TodayPayload };
      if (payload.ok && payload.data) initialPayload = payload.data;
    }
  } catch {
    initialPayload = createDemoTodayPayload();
  }

  return <TodayPageClient initialPayload={initialPayload} />;
}
