import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';
import { normalizeSpine } from '@/src/core/nervous/spine';

const readFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function CanonicalLanding({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const initialSpine = normalizeSpine({
    sport: readFirst(searchParams?.sport),
    date: readFirst(searchParams?.date),
    tz: readFirst(searchParams?.tz),
    mode: readFirst(searchParams?.mode),
    trace_id: readFirst(searchParams?.trace_id),
    traceId: readFirst(searchParams?.traceId),
    tab: readFirst(searchParams?.tab)
  });

  return (
    <NervousSystemProvider initialSpine={initialSpine}>
      <CockpitLandingClient searchParams={searchParams} />
    </NervousSystemProvider>
  );
}
