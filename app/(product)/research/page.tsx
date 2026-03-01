import { redirect } from 'next/navigation';

import { buildRedirectWithQuery } from '@/src/core/routing/preserveQueryRedirect';

export default function ResearchAliasPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  redirect(buildRedirectWithQuery('/stress-test', searchParams));
}
