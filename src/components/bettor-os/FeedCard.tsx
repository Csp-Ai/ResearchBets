'use client';

import { useState } from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';

export type FeedCardPost = {
  id: string;
  content: string;
  createdAt: string;
  cloneCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  weakestLegId?: string | null;
  outcome?: 'win' | 'loss' | 'void' | null;
  feedbackByMe?: 'up' | 'down' | null;
  author: { username: string };
  betDetails?: { legs?: { id: string; text: string }[] } | null;
};

export function FeedCard({ post, onCloned }: { post: FeedCardPost; onCloned?: (postId: string, legs: { id: string; text: string }[]) => void }) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(post.feedbackByMe ?? null);
  const tint = post.outcome === 'win' ? 'bg-emerald-900/20 border-emerald-600/20' : post.outcome === 'loss' ? 'bg-rose-900/20 border-rose-600/20' : '';

  const clonePost = async () => {
    await fetch('/api/community', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'clone', postId: post.id })
    });
    onCloned?.(post.id, post.betDetails?.legs ?? []);
  };

  const submitFeedback = async (value: 'up' | 'down') => {
    const previous = feedback;
    setFeedback(value);
    const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('sb-access-token') : null;

    const response = await fetch(`/api/feed/${post.id}/feedback`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ value })
    });

    if (!response.ok) setFeedback(previous);
  };

  const showFeedback = post.outcome === 'win' || post.outcome === 'loss' || post.outcome === 'void';

  return (
    <Surface kind="card" className={`border-white/10 p-4 ${tint}`}>
      <div className="flex items-center justify-between">
        <Link href={`/u/${post.author.username}`} className="text-sm text-cyan-300">@{post.author.username}</Link>
        <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
      </div>
      <p className="mt-3 text-slate-100">{post.content}</p>
      <motion.div whileHover={{ height: 'auto' }} initial={{ height: 34 }} className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
        {(post.betDetails?.legs ?? []).length === 0 ? (
          <p>No shared legs.</p>
        ) : (
          <ul className="space-y-2">
            {(post.betDetails?.legs ?? []).map((leg) => (
              <li key={leg.id} className={post.weakestLegId === leg.id ? 'text-amber-300' : ''}>{leg.text}</li>
            ))}
          </ul>
        )}
      </motion.div>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
        <span>{post.cloneCount} clones</span>
        <span>{post.commentCount} comments</span>
        <span>{post.isLikedByMe ? 'Liked' : 'Not liked'}</span>
      </div>
      {showFeedback ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <button type="button" onClick={() => void submitFeedback('up')} className={`rounded px-2 py-1 ${feedback === 'up' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-200'}`}>👍</button>
          <button type="button" onClick={() => void submitFeedback('down')} className={`rounded px-2 py-1 ${feedback === 'down' ? 'bg-rose-600 text-white' : 'bg-white/10 text-slate-200'}`}>👎</button>
        </div>
      ) : null}
      <Button className="mt-3" intent="secondary" onClick={() => void clonePost()}>Clone</Button>
    </Surface>
  );
}
