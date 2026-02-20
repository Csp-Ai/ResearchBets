'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CommunityPost = {
  id: string;
  content: string;
  sport?: string | null;
  league?: string | null;
  tags: string[];
  createdAt: string;
  author: { username: string; avatarUrl?: string | null };
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    fetch('/api/community?limit=20')
      .then((res) => res.json())
      .then((data) => setPosts((data.posts ?? []) as CommunityPost[]));
  }, []);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold">Community</h1>
        <p className="text-sm text-slate-300">Share your angle with evidence and context.</p>
      </header>
      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.id} className="bettor-card p-4">
            <Link href={`/u/${post.author.username}`} className="text-sm text-cyan-300">@{post.author.username}</Link>
            <p className="mt-2 text-base">{post.content}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              {post.league ? <span className="rounded-full border border-white/15 px-2 py-0.5">{post.league}</span> : null}
              {post.sport ? <span className="rounded-full border border-white/15 px-2 py-0.5">{post.sport}</span> : null}
              {post.tags?.map((tag) => <span key={tag} className="rounded-full border border-white/15 px-2 py-0.5">#{tag}</span>)}
            </div>
            <p className="mt-3 text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
          </article>
        ))}
        {posts.length === 0 ? <p className="text-sm text-slate-400">No posts yet.</p> : null}
      </div>
    </section>
  );
}
