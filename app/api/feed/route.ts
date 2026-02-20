import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/src/services/supabase';

type FeedCursor = { createdAt: string; id: string };

const encodeCursor = (cursor: FeedCursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url');
const decodeCursor = (value: string | null): FeedCursor | null => {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as FeedCursor;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20') || 20, 40);
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const viewerId = request.headers.get('x-user-id');

  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from('community_posts')
    .select('id, user_id, content, sport, league, tags, created_at, clone_count, comment_count, is_shared, bet_details, historical_bet_id')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor.createdAt);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load feed.' }, { status: 500 });

  const rows = data ?? [];
  const sliced = rows.slice(0, limit);
  const userIds = [...new Set(sliced.map((row) => row.user_id).filter(Boolean))] as string[];
  const postIds = sliced.map((row) => row.id);

  const [profilesRes, likesRes] = await Promise.all([
    userIds.length > 0 ? supabase.from('user_profiles').select('user_id, username, avatar_url').in('user_id', userIds) : Promise.resolve({ data: [] }),
    viewerId && postIds.length > 0 ? supabase.from('community_post_likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds) : Promise.resolve({ data: [] })
  ]);

  const profiles = new Map((profilesRes.data ?? []).map((profile) => [profile.user_id as string, profile]));
  const liked = new Set((likesRes.data ?? []).map((like) => like.post_id as string));

  const posts = sliced.map((row) => {
    const profile = row.user_id ? profiles.get(row.user_id) : null;
    return {
      id: row.id,
      content: row.content,
      sport: row.sport,
      league: row.league,
      tags: row.tags ?? [],
      createdAt: row.created_at,
      cloneCount: Number(row.clone_count ?? 0),
      commentCount: Number(row.comment_count ?? 0),
      isLikedByMe: liked.has(row.id),
      author: {
        userId: row.user_id,
        username: (profile?.username as string | undefined) ?? 'anonymous',
        avatarUrl: (profile?.avatar_url as string | undefined) ?? null
      },
      betDetails: row.is_shared ? row.bet_details : null,
      historicalBetId: row.is_shared ? row.historical_bet_id : null
    };
  });

  const nextCursor = rows.length > limit ? encodeCursor({ createdAt: sliced[sliced.length - 1]!.created_at as string, id: sliced[sliced.length - 1]!.id as string }) : null;

  return NextResponse.json({ posts, nextCursor });
}
