import { redirect } from 'next/navigation';

import { normalizeSpine } from '@/src/core/nervous/spine';
import { toHref } from '@/src/core/nervous/routes';

type LiveAliasPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const readFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default function LiveAliasPage({ searchParams }: LiveAliasPageProps) {
  const spine = normalizeSpine({
    trace_id: readFirst(searchParams?.trace_id),
    sport: readFirst(searchParams?.sport),
    tz: readFirst(searchParams?.tz),
    date: readFirst(searchParams?.date),
    mode: readFirst(searchParams?.mode),
    tab: readFirst(searchParams?.tab)
  });

  redirect(toHref('/control', spine, {
    tab: 'live'
  }));
}
