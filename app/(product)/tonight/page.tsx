import { TonightPageClient } from './TonightPageClient';

import { getTodayPayload } from '@/src/core/today/service.server';

export default async function TonightPage() {
  const payload = await getTodayPayload();
  return <TonightPageClient payload={payload} />;
}
