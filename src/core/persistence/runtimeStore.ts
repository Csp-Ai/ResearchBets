import type { ControlPlaneEvent } from '../control-plane/events';
import type { ResearchReport } from '../evidence/evidenceSchema';
import type { MarketType } from '../markets/marketType';

export interface SessionRecord {
  sessionId: string;
  userId: string;
  lastSeenAt: string;
}

export interface StoredBet {
  id: string;
  userId: string;
  sessionId: string;
  snapshotId: string;
  traceId: string;
  runId: string;
  selection: string;
  gameId?: string | null;
  marketType?: MarketType | null;
  line?: number | null;
  book?: string | null;
  odds: number;
  recommendedId?: string | null;
  followedAi?: boolean;
  placedLine?: number | null;
  placedPrice?: number | null;
  closingLine?: number | null;
  closingPrice?: number | null;
  clvLine?: number | null;
  clvPrice?: number | null;
  stake: number;
  status: 'pending' | 'settled';
  outcome: 'won' | 'lost' | 'push' | null;
  settledProfit: number | null;
  confidence: number;
  createdAt: string;
  settledAt: string | null;
  resolutionReason?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
}

export interface AgentRecommendation {
  id: string;
  parentRecommendationId: string | null;
  groupId: string | null;
  recommendationType: 'agent' | 'final';
  sessionId: string;
  userId: string;
  requestId: string;
  traceId: string;
  runId: string;
  agentId: string;
  agentVersion: string;
  gameId: string;
  marketType: MarketType;
  market: string;
  selection: string;
  line: number | null;
  price: number | null;
  confidence: number;
  rationale: Record<string, unknown>;
  evidenceRefs: Record<string, unknown>;
  createdAt: string;
}

export interface OddsSnapshot {
  id: string;
  gameId: string;
  market: string;
  marketType: MarketType;
  selection: string;
  line: number | null;
  price: number | null;
  book: string;
  capturedAt: string;
  gameStartsAt: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  fetchedAt: string;
  publishedAt: string | null;
  parserVersion: string;
  checksum: string;
  stalenessMs: number;
  freshnessScore: number;
  resolutionReason: string | null;
  consensusLevel: 'single_source' | 'two_source_agree' | 'three_source_agree' | 'conflict';
  sourcesUsed: string[];
  disagreementScore: number;
}

export interface GameResultRecord {
  id: string;
  gameId: string;
  payload: Record<string, unknown>;
  completedAt: string;
  createdAt: string;
  isFinal: boolean;
  sourceUrl: string | null;
  sourceDomain: string | null;
  fetchedAt: string;
  publishedAt: string | null;
  parserVersion: string;
  checksum: string;
  stalenessMs: number;
  freshnessScore: number;
  consensusLevel: 'single_source' | 'two_source_agree' | 'three_source_agree' | 'conflict';
  sourcesUsed: string[];
  disagreementScore: number;
}

export interface WebCacheRecord {
  id: string;
  url: string;
  domain: string;
  fetchedAt: string;
  status: number;
  etag: string | null;
  lastModified: string | null;
  contentHash: string;
  responseBody: string;
  expiresAt: string | null;
}

export interface RecommendationOutcome {
  id: string;
  recommendationId: string;
  gameId: string;
  outcome: 'won' | 'lost' | 'push' | 'void';
  closingLine: number | null;
  closingPrice: number | null;
  clvLine: number | null;
  clvPrice: number | null;
  settledAt: string;
  resolutionReason: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ExperimentAssignment {
  id: string;
  experimentName: string;
  assignment: 'control' | 'treatment';
  subjectKey: string;
  userId: string | null;
  anonSessionId: string | null;
  createdAt: string;
}


export interface InsightNodeRecord {
  insightId: string;
  traceId: string;
  runId: string;
  gameId: string;
  agentKey: string;
  track: 'baseline' | 'hybrid';
  insightType: 'injury' | 'line_move' | 'matchup_stat' | 'narrative' | 'weather' | 'market_delta' | 'correlated_risk';
  claim: string;
  evidence: Array<{ source: string; url?: string; snippet?: string }>;
  confidence: number;
  timestamp: string;
  decayHalfLifeMinutes: number;
  marketImplied?: number;
  modelImplied?: number;
  delta?: number;
}

export interface SlipSubmission {
  id: string;
  anonSessionId: string | null;
  userId: string | null;
  createdAt: string;
  source: 'paste' | 'upload';
  rawText: string;
  parseStatus: 'received' | 'parsed' | 'failed';
  extractedLegs: Record<string, unknown>[] | null;
  traceId: string;
  requestId: string;
  checksum: string;
}

export interface SlipSubmissionListQuery {
  anonSessionId?: string;
  userId?: string;
  limit?: number;
}

export interface RuntimeEventQuery {
  traceId?: string;
  limit?: number;
}

export interface IdempotencyRecord<T> {
  endpoint: string;
  userId: string;
  key: string;
  response: T;
  responseHash: string;
  createdAt: string;
}

export interface RuntimeStore {
  getSession(sessionId: string): Promise<SessionRecord | null>;
  upsertSession(session: SessionRecord): Promise<void>;
  saveSnapshot(report: ResearchReport): Promise<void>;
  getSnapshot(reportId: string): Promise<ResearchReport | null>;
  listBets(status?: StoredBet['status']): Promise<StoredBet[]>;
  saveBet(bet: StoredBet): Promise<void>;
  getBet(betId: string): Promise<StoredBet | null>;
  saveEvent(event: ControlPlaneEvent): Promise<void>;
  getIdempotencyRecord<T>(endpoint: string, userId: string, key: string): Promise<IdempotencyRecord<T> | null>;
  saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void>;
  saveRecommendation(recommendation: AgentRecommendation): Promise<void>;
  listRecommendationsByGame(gameId: string): Promise<AgentRecommendation[]>;
  getRecommendation(recommendationId: string): Promise<AgentRecommendation | null>;
  saveOddsSnapshot(snapshot: OddsSnapshot): Promise<void>;
  listOddsSnapshots(gameId: string, market: string, selection: string): Promise<OddsSnapshot[]>;
  saveGameResult(result: GameResultRecord): Promise<void>;
  getGameResult(gameId: string): Promise<GameResultRecord | null>;
  saveWebCache(record: WebCacheRecord): Promise<void>;
  getLatestWebCacheByUrl(url: string): Promise<WebCacheRecord | null>;
  saveRecommendationOutcome(outcome: RecommendationOutcome): Promise<void>;
  saveInsightNode(node: InsightNodeRecord): Promise<void>;
  listInsightNodesByRun(runId: string): Promise<InsightNodeRecord[]>;
  getRecommendationOutcome(recommendationId: string): Promise<RecommendationOutcome | null>;
  saveExperiment(experiment: ExperimentRecord): Promise<void>;
  getExperiment(name: string): Promise<ExperimentRecord | null>;
  saveExperimentAssignment(assignment: ExperimentAssignment): Promise<void>;
  getExperimentAssignment(experimentName: string, subjectKey: string): Promise<ExperimentAssignment | null>;
  createSlipSubmission(submission: SlipSubmission): Promise<void>;
  getSlipSubmission(id: string): Promise<SlipSubmission | null>;
  listSlipSubmissions(query: SlipSubmissionListQuery): Promise<SlipSubmission[]>;
  updateSlipSubmission(id: string, patch: Partial<Omit<SlipSubmission, 'id' | 'createdAt'>>): Promise<SlipSubmission | null>;
  listEvents(query?: RuntimeEventQuery): Promise<ControlPlaneEvent[]>;
}
