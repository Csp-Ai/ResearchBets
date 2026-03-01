import { redirect } from 'next/navigation';

import { buildCockpitEntryHref } from '@/src/core/routing/cockpitEntry';

export default function LandingPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  redirect(buildCockpitEntryHref(searchParams));
}
