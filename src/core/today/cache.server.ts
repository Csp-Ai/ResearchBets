import 'server-only';

import type { BoardSport } from '@/src/core/board/boardService.server';
import { getSupabaseServiceClient } from '@/src/core/supabase/service';
import type { TodayPayload } from './types';

export type TodayCacheKey = { sport: BoardSport; tz: string; date: string };

type CacheRecord = {
  payload: TodayPayload;
  savedAt: string;
};

const MEMORY_CACHE = new Map<string, CacheRecord>();

export const TODAY_CACHE_TTL_MS = 10 * 60_000;

export function getTodayCacheKey(ctx: TodayCacheKey): string {
  return `today:${ctx.sport}:${ctx.tz}:${ctx.date}`;
}

function isFresh(savedAt: string): boolean {
  const stamp = new Date(savedAt).getTime();
  if (!Number.isFinite(stamp)) return false;
  return Date.now() - stamp <= TODAY_CACHE_TTL_MS;
}

function fromMemory(key: string): CacheRecord | null {
  const record = MEMORY_CACHE.get(key);
  if (!record) return null;
  if (!isFresh(record.savedAt)) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return record;
}

export async function readLastGoodToday(keyInput: TodayCacheKey): Promise<CacheRecord | null> {
  const cacheKey = getTodayCacheKey(keyInput);

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('today_cache')
      .select('payload, saved_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return fromMemory(cacheKey);

    const savedAt = data.saved_at;
    if (!isFresh(savedAt)) return null;

    const record: CacheRecord = {
      payload: data.payload as TodayPayload,
      savedAt,
    };
    MEMORY_CACHE.set(cacheKey, record);
    return record;
  } catch {
    return fromMemory(cacheKey);
  }
}

export async function writeLastGoodToday(keyInput: TodayCacheKey, payload: TodayPayload): Promise<void> {
  const cacheKey = getTodayCacheKey(keyInput);
  const savedAt = new Date().toISOString();
  MEMORY_CACHE.set(cacheKey, { payload, savedAt });

  try {
    const supabase = getSupabaseServiceClient();
    await supabase
      .from('today_cache')
      .upsert({
        cache_key: cacheKey,
        sport: keyInput.sport,
        tz: keyInput.tz,
        date: keyInput.date,
        payload,
        saved_at: savedAt,
      }, { onConflict: 'cache_key' });
  } catch {
    // deterministic fallback remains memory-only when durable store is unavailable
  }
}
