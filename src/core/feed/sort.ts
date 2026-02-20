export type FeedSortMode = 'latest' | 'trending' | 'high_confidence';

export type LatestCursor = { sort: 'latest'; createdAt: string; id: string };
export type TrendingCursor = { sort: 'trending'; cloneCount: number; createdAt: string; id: string };
export type HighConfidenceCursor = { sort: 'high_confidence'; gmConfidence: number; createdAt: string; id: string };

export type FeedCursor = LatestCursor | TrendingCursor | HighConfidenceCursor;

export const parseFeedSort = (value: string | null): FeedSortMode => {
  if (value === 'trending' || value === 'high_confidence') return value;
  return 'latest';
};

export const encodeFeedCursor = (cursor: FeedCursor): string => Buffer.from(JSON.stringify(cursor)).toString('base64url');

export const decodeFeedCursor = (value: string | null): FeedCursor | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<FeedCursor>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.sort !== 'string') return null;
    if (parsed.sort === 'latest' && typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') return parsed as LatestCursor;
    if (parsed.sort === 'trending' && typeof parsed.cloneCount === 'number' && typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') return parsed as TrendingCursor;
    if (parsed.sort === 'high_confidence' && typeof parsed.gmConfidence === 'number' && typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') return parsed as HighConfidenceCursor;
    return null;
  } catch {
    return null;
  }
};

export const isCursorCompatible = (cursor: FeedCursor | null, sort: FeedSortMode): boolean => !cursor || cursor.sort === sort;
