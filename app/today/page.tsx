import { TodayPageClient } from '@/src/components/today/TodayPageClient';
import { getTodayPayload } from '@/src/core/today/service.server';

type TodayPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const readValue = (value: string | string[] | undefined, fallback: string): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return fallback;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const sport = readValue(searchParams?.sport, 'NBA') as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC';
  const date = readValue(searchParams?.date, new Date().toISOString().slice(0, 10));
  const tz = readValue(searchParams?.tz, 'America/Phoenix');
  const mode = readValue(searchParams?.mode, 'live') === 'demo' ? 'demo' : 'live';
  const payload = await getTodayPayload({ sport, date, tz, mode });
  return <TodayPageClient initialPayload={payload} />;
}
