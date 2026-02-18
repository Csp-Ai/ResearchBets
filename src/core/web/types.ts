export type WalDataType = 'odds' | 'results' | 'news';

export interface WebSourceProvenance {
  url: string;
  domain: string;
  fetchedAt: string;
  publishedAt: string | null;
  parserVersion: string;
  checksum: string;
  status: number;
  etag: string | null;
}

export interface WalRequest {
  url: string;
  dataType: WalDataType;
  parserHint?: 'json' | 'html';
  maxStalenessMs: number;
}

export interface WalNormalizedRecord {
  gameId: string;
  market?: string;
  marketType?: 'spread' | 'total' | 'moneyline';
  selection?: string;
  line?: number | null;
  price?: number | null;
  book?: string;
  completedAt?: string;
  payload?: Record<string, unknown>;
  isFinal?: boolean;
  capturedAt?: string;
  stalenessMs: number;
  freshnessScore: number;
  sourceUrl: string;
  sourceDomain: string;
  fetchedAt: string;
  publishedAt: string | null;
  parserVersion: string;
  checksum: string;
}

export interface WalAcquireResponse {
  records: WalNormalizedRecord[];
  provenance: WebSourceProvenance;
  stale: boolean;
}
