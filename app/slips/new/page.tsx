import { redirect } from 'next/navigation';

import { toHref } from '@/src/core/nervous/routes';
import { DEFAULT_SPINE, type QuerySpine } from '@/src/core/nervous/spine';

type NewSlipPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const readParam = (searchParams: NewSlipPageProps['searchParams'], key: keyof QuerySpine) => {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
};

export default function NewSlipPage({ searchParams }: NewSlipPageProps) {
  const spine: QuerySpine = {
    sport: readParam(searchParams, 'sport') ?? DEFAULT_SPINE.sport,
    tz: readParam(searchParams, 'tz') ?? DEFAULT_SPINE.tz,
    date: readParam(searchParams, 'date') ?? DEFAULT_SPINE.date,
    mode: readParam(searchParams, 'mode') === 'live' ? 'live' : 'demo',
    trace_id: readParam(searchParams, 'trace_id') ?? DEFAULT_SPINE.trace_id,
  };

  redirect(toHref('/slip', spine));
}
