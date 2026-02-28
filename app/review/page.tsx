'use client';

import { useMemo } from 'react';

import { EdgeProfileCard } from '@/src/components/review/EdgeProfileCard';
import { PostmortemList } from '@/src/components/review/PostmortemList';
import { getEdgeProfile, listPostmortems } from '@/src/core/review/store';

export default function ReviewPage() {
  const records = useMemo(() => listPostmortems(), []);
  const profile = useMemo(() => getEdgeProfile(), []);

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20" data-testid="review-page">
      <EdgeProfileCard profile={profile} />
      <PostmortemList records={records} />
    </section>
  );
}
