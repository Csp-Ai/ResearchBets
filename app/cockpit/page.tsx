import { redirect } from 'next/navigation';

import { buildRedirectWithQuery } from '@/src/core/routing/preserveQueryRedirect';

export default function CockpitPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  redirect(buildRedirectWithQuery('/', searchParams));
}
