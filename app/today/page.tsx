import { TodayPageClient } from '@/src/components/today/TodayPageClient';
import { getTodayPayload } from '@/src/core/today/service.server';

export default async function TodayPage() {
  const payload = await getTodayPayload();
  return <TodayPageClient initialPayload={payload} />;
}
