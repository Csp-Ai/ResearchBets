import { walConfig } from './config';
import type { WalDataType, WalNormalizedRecord } from './types';

const scoreFreshness = (stalenessMs: number, maxStalenessMs: number): number => {
  if (maxStalenessMs <= 0) return 0;
  return Math.max(0, Math.min(1, Number((1 - stalenessMs / maxStalenessMs).toFixed(6))));
};

const asNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const normalizeRecords = ({
  dataType,
  parsed,
  fetchedAt,
  sourceUrl,
  sourceDomain,
  parserVersion,
  checksum,
  maxStalenessMs,
}: {
  dataType: WalDataType;
  parsed: Record<string, unknown>;
  fetchedAt: string;
  sourceUrl: string;
  sourceDomain: string;
  parserVersion?: string;
  checksum: string;
  maxStalenessMs: number;
}): WalNormalizedRecord[] => {
  const publishedAt = (parsed.published_at as string | undefined) ?? null;
  const publishedTs = publishedAt ? new Date(publishedAt).getTime() : new Date(fetchedAt).getTime();
  const stalenessMs = Math.max(0, new Date(fetchedAt).getTime() - publishedTs);
  const freshnessScore = scoreFreshness(stalenessMs, maxStalenessMs);
  const pv = parserVersion ?? walConfig.parserVersion;

  if (dataType === 'odds') {
    return [
      {
        gameId: String(parsed.game_id ?? parsed.gameId ?? ''),
        market: String(parsed.market ?? 'spread'),
        marketType: (parsed.market_type as 'spread' | 'total' | 'moneyline' | undefined) ?? 'spread',
        selection: String(parsed.selection ?? 'home'),
        line: asNumber(parsed.line),
        price: asNumber(parsed.price),
        book: String(parsed.book ?? 'unknown_book'),
        capturedAt: fetchedAt,
        stalenessMs,
        freshnessScore,
        sourceUrl,
        sourceDomain,
        fetchedAt,
        publishedAt,
        parserVersion: pv,
        checksum,
      },
    ];
  }

  if (dataType === 'results') {
    return [
      {
        gameId: String(parsed.game_id ?? parsed.gameId ?? ''),
        completedAt: String(parsed.completed_at ?? fetchedAt),
        payload: parsed,
        isFinal: Boolean(parsed.is_final ?? parsed.final ?? false),
        stalenessMs,
        freshnessScore,
        sourceUrl,
        sourceDomain,
        fetchedAt,
        publishedAt,
        parserVersion: pv,
        checksum,
      },
    ];
  }

  return [
    {
      gameId: String(parsed.game_id ?? parsed.gameId ?? ''),
      payload: parsed,
      stalenessMs,
      freshnessScore,
      sourceUrl,
      sourceDomain,
      fetchedAt,
      publishedAt,
      parserVersion: pv,
      checksum,
    },
  ];
};
