import { NextResponse } from 'next/server';
import { z } from 'zod';

import { applyRateLimit } from '@/src/core/http/rateLimit';
import { getSupabaseServiceClient } from '@/src/services/supabase';

const createPostSchema = z.object({
  content: z.string().trim().min(8).max(500),
  sport: z.string().trim().max(40).optional(),
  league: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional()
});

const cloneSchema = z.object({
  action: z.literal('clone'),
  postId: z.string().uuid()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20') || 20, 50);
  const page = Math.max(Number(url.searchParams.get('page') ?? '1') || 1, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, user_id, content, sport, league, tags, created_at')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: 'Unable to load community posts.' }, { status: 500 });

  const userIds = [...new Set((data ?? []).map((row) => row.user_id).filter(Boolean))];
  const profileMap = new Map<string, { username: string | null; avatar_url: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.user_id as string, {
        username: profile.username as string | null,
        avatar_url: profile.avatar_url as string | null
      });
    }
  }

  const posts = (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    sport: row.sport,
    league: row.league,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    author: {
      userId: row.user_id,
      username: row.user_id ? profileMap.get(row.user_id)?.username ?? 'anonymous' : 'anonymous',
      avatarUrl: row.user_id ? profileMap.get(row.user_id)?.avatar_url ?? null : null
    }
  }));

  return NextResponse.json({ posts, page, limit });
}

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { route: 'community:post', limit: 10 });
  if (limited) return limited;

  const body = await request.json();
  const cloneParsed = cloneSchema.safeParse(body);
  if (cloneParsed.success) {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.rpc('increment_clone_count', { p_post_id: cloneParsed.data.postId });
    if (error) return NextResponse.json({ error: 'Unable to clone post.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(bearer);
  const user = authData?.user;
  if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid post payload.' }, { status: 400 });

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      sport: parsed.data.sport ?? null,
      league: parsed.data.league ?? null,
      tags: parsed.data.tags ?? []
    })
    .select('id, user_id, content, sport, league, tags, created_at')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Unable to create post.' }, { status: 500 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    post: {
      id: data.id,
      content: data.content,
      sport: data.sport,
      league: data.league,
      tags: data.tags ?? [],
      createdAt: data.created_at,
      author: {
        userId: data.user_id,
        username: profile?.username ?? 'anonymous',
        avatarUrl: profile?.avatar_url ?? null
      }
    }
  });
}
