'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FeedCard, type FeedCardPost } from '@/src/components/bettor-os/FeedCard';
import { Button } from '@/src/components/ui/button';

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedCardPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  const load = async (next?: string | null) => {
    const query = new URLSearchParams({ limit: '10' });
    if (next) query.set('cursor', next);
    const data = await fetch(`/api/feed?${query.toString()}`).then((res) => res.json());
    setPosts((prev) => [...prev, ...((data.posts ?? []) as FeedCardPost[])]);
    setCursor((data.nextCursor as string | null) ?? null);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold">Community</h1>
        <p className="text-sm text-slate-300">Track ideas, clone smart slips, and run your own research in one feed.</p>
      </header>
      <div className="space-y-3">
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            onCloned={(_postId, legs) => {
              const prefill = legs.map((leg) => leg.text).join('\n');
              router.push(`/research?tab=analyze&prefill=${encodeURIComponent(prefill)}`);
            }}
          />
        ))}
        {cursor ? <Button intent="secondary" onClick={() => void load(cursor)}>Load more</Button> : null}
        {posts.length === 0 ? <p className="text-sm text-slate-400">No posts yet.</p> : null}
      </div>
    </section>
  );
}
