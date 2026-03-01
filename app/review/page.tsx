'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { EdgeProfileCard } from '@/src/components/review/EdgeProfileCard';
import { PostmortemList } from '@/src/components/review/PostmortemList';
import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { getEdgeProfile, listPostmortems } from '@/src/core/review/store';

export default function ReviewPage() {
  const nervous = useNervousSystem();
  const records = useMemo(() => listPostmortems(), []);
  const profile = useMemo(() => getEdgeProfile(), []);

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20" data-testid="review-page">
      <EdgeProfileCard profile={profile} />
      {records.length === 0 ? (
        <section className="row-shell">
          <p className="text-sm font-semibold text-slate-100">No postmortems yet</p>
          <p className="mt-1 text-xs text-slate-300">Settle a ticket to unlock Edge Profile drift + next-time guardrail suggestions.</p>
          <Link href={appendQuery(nervous.toHref('/track'), {})} className="ui-button ui-button-primary mt-2 min-h-0 px-3 py-1.5 text-xs">Settle a ticket</Link>
        </section>
      ) : null}
      <PostmortemList records={records} />
    </section>
  );
}
