import { NextResponse } from 'next/server';

import { decodeFeedCursor, encodeFeedCursor, isCursorCompatible, parseFeedSort, type FeedSortMode } from '@/src/core/feed/sort';
import { getSupabaseServiceClient } from '@/src/services/supabase';

const trendingWindowStartIso = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const resolveViewerId = async (request: Request): Promise<string | null> => {
  const headerViewerId = request.headers.get('x-user-id');
  if (headerViewerId) return headerViewerId;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return null;

  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.auth.getUser(bearer);
  return data.user?.id ?? null;
};

const buildFeedQuery = (supabase: ReturnType<typeof getSupabaseServiceClient>, limit: number) => supabase
  .from('community_posts')
  .select('id, user_id, content, sport, league, tags, created_at, clone_count, comment_count, is_shared, bet_details, historical_bet_id, gm_confidence, settlement_status')
  .limit(limit + 1);

const applySort = (query: ReturnType<typeof buildFeedQuery>, sort: FeedSortMode) => {
  if (sort === 'trending') {
    return query
      .gte('created_at', trendingWindowStartIso())
      .order('clone_count', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
  }

  if (sort === 'high_confidence') {
    return query
      .gte('gm_confidence', 80)
      .order('gm_confidence', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
  }

  return query.order('created_at', { ascending: false }).order('id', { ascending: false });
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20') || 20, 40);
  const sort = parseFeedSort(url.searchParams.get('sort'));
  const cursor = decodeFeedCursor(url.searchParams.get('cursor'));

  if (!isCursorCompatible(cursor, sort)) {
    return NextResponse.json({ error: 'Invalid cursor for this sort mode.' }, { status: 400 });
  }

  const viewerId = await resolveViewerId(request);
  const supabase = getSupabaseServiceClient();

  let query = buildFeedQuery(supabase, limit);

  query = applySort(query, sort);

  if (cursor?.sort === 'latest') {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  if (cursor?.sort === 'trending') {
    query = query.or(`clone_count.lt.${cursor.cloneCount},and(clone_count.eq.${cursor.cloneCount},created_at.lt.${cursor.createdAt}),and(clone_count.eq.${cursor.cloneCount},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  if (cursor?.sort === 'high_confidence') {
    query = query.or(`gm_confidence.lt.${cursor.gmConfidence},and(gm_confidence.eq.${cursor.gmConfidence},created_at.lt.${cursor.createdAt}),and(gm_confidence.eq.${cursor.gmConfidence},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load feed.' }, { status: 500 });

  const rows = data ?? [];
  const sliced = rows.slice(0, limit);
  const userIds = [...new Set(sliced.map((row) => row.user_id).filter(Boolean))] as string[];
  const postIds = sliced.map((row) => row.id);

  const [profilesRes, likesRes, feedbackRes] = await Promise.all([
    userIds.length > 0 ? supabase.from('user_profiles').select('user_id, username, avatar_url').in('user_id', userIds) : Promise.resolve({ data: [] }),
    viewerId && postIds.length > 0 ? supabase.from('community_post_likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds) : Promise.resolve({ data: [] }),
    viewerId && postIds.length > 0 ? supabase.from('post_feedback').select('post_id, value').eq('user_id', viewerId).in('post_id', postIds) : Promise.resolve({ data: [] })
  ]);

  const profiles = new Map((profilesRes.data ?? []).map((profile) => [profile.user_id as string, profile]));
  const liked = new Set((likesRes.data ?? []).map((like) => like.post_id as string));
  const feedbackByPost = new Map((feedbackRes.data ?? []).map((feedback) => [feedback.post_id as string, feedback.value as 'up' | 'down']));

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
      gmConfidence: Number(row.gm_confidence ?? 0),
      outcome: row.settlement_status ?? null,
      isLikedByMe: liked.has(row.id),
      feedbackByMe: feedbackByPost.get(row.id) ?? null,
      author: {
        userId: row.user_id,
        username: (profile?.username as string | undefined) ?? 'anonymous',
        avatarUrl: (profile?.avatar_url as string | undefined) ?? null
      },
      betDetails: row.is_shared ? row.bet_details : null,
      historicalBetId: row.is_shared ? row.historical_bet_id : null
    };
  });

  const last = sliced[sliced.length - 1];
  const nextCursor = rows.length > limit && last
    ? sort === 'trending'
      ? encodeFeedCursor({ sort: 'trending', cloneCount: Number(last.clone_count ?? 0), createdAt: String(last.created_at), id: String(last.id) })
      : sort === 'high_confidence'
        ? encodeFeedCursor({ sort: 'high_confidence', gmConfidence: Number(last.gm_confidence ?? 0), createdAt: String(last.created_at), id: String(last.id) })
        : encodeFeedCursor({ sort: 'latest', createdAt: String(last.created_at), id: String(last.id) })
    : null;

  return NextResponse.json({ posts, nextCursor, sort });
}
