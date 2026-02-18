import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ControlPlaneEvent } from '../control-plane/events';
import type { ResearchReport } from '../evidence/evidenceSchema';

import type {
  AgentRecommendation,
  ExperimentAssignment,
  ExperimentRecord,
  GameResultRecord,
  IdempotencyRecord,
  OddsSnapshot,
  RecommendationOutcome,
  RuntimeStore,
  InsightNodeRecord,
  SessionRecord,
  SlipSubmission,
  StoredBet,
  WebCacheRecord,
} from './runtimeStore';

const createSupabaseClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials are not configured');
  return createClient(url, key);
};

const TABLES = {
  sessions: 'runtime_sessions',
  snapshots: 'research_reports',
  bets: 'bets',
  events: 'events_analytics',
  idempotency: 'idempotency_keys',
  recommendations: 'ai_recommendations',
  oddsSnapshots: 'odds_snapshots',
  gameResults: 'game_results',
  recommendationOutcomes: 'recommendation_outcomes',
  experiments: 'experiments',
  experimentAssignments: 'experiment_assignments',
  webCache: 'web_cache',
  slipSubmissions: 'slip_submissions',
  insightNodes: 'insight_nodes',
} as const;

const mapBet = (data: Record<string, unknown>): StoredBet => ({
  id: data.id as string,
  userId: data.user_id as string,
  sessionId: data.session_id as string,
  snapshotId: ((data.snapshot_id as string | null) ?? '') || '',
  traceId: ((data.trace_id as string | null) ?? '') || '',
  runId: ((data.run_id as string | null) ?? '') || '',
  selection: data.selection as string,
  gameId: (data.game_id as string | null) ?? null,
  marketType: (data.market_type as StoredBet['marketType']) ?? null,
  line: data.line == null ? null : Number(data.line),
  book: (data.book as string | null) ?? null,
  odds: Number(data.odds),
  recommendedId: (data.recommended_id as string | null) ?? null,
  followedAi: Boolean(data.followed_ai),
  placedLine: data.placed_line == null ? null : Number(data.placed_line),
  placedPrice: data.placed_price == null ? null : Number(data.placed_price),
  closingLine: data.closing_line == null ? null : Number(data.closing_line),
  closingPrice: data.closing_price == null ? null : Number(data.closing_price),
  clvLine: data.clv_line == null ? null : Number(data.clv_line),
  clvPrice: data.clv_price == null ? null : Number(data.clv_price),
  stake: Number(data.stake),
  status: data.status as StoredBet['status'],
  outcome: (data.outcome as StoredBet['outcome']) ?? null,
  settledProfit: data.settled_profit == null ? null : Number(data.settled_profit),
  confidence: Number(data.confidence ?? 0),
  createdAt: data.created_at as string,
  settledAt: (data.settled_at as string | null) ?? null,
  resolutionReason: (data.resolution_reason as string | null) ?? null,
  sourceUrl: (data.source_url as string | null) ?? null,
  sourceDomain: (data.source_domain as string | null) ?? null,
});

const mapRecommendation = (data: Record<string, unknown>): AgentRecommendation => ({
  id: data.id as string,
  parentRecommendationId: (data.parent_recommendation_id as string | null) ?? null,
  groupId: (data.group_id as string | null) ?? null,
  recommendationType: data.recommendation_type as AgentRecommendation['recommendationType'],
  sessionId: data.session_id as string,
  userId: data.user_id as string,
  requestId: data.request_id as string,
  traceId: data.trace_id as string,
  runId: data.run_id as string,
  agentId: data.agent_id as string,
  agentVersion: data.agent_version as string,
  gameId: data.game_id as string,
  marketType: data.market_type as AgentRecommendation['marketType'],
  market: data.market as string,
  selection: data.selection as string,
  line: data.line == null ? null : Number(data.line),
  price: data.price == null ? null : Number(data.price),
  confidence: Number(data.confidence),
  rationale: (data.rationale as Record<string, unknown>) ?? {},
  evidenceRefs: (data.evidence_refs as Record<string, unknown>) ?? {},
  createdAt: data.created_at as string,
});

export class SupabaseRuntimeStore implements RuntimeStore {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? createSupabaseClient();
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from(TABLES.sessions)
      .select('session_id,user_id,last_seen_at')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { sessionId: data.session_id as string, userId: data.user_id as string, lastSeenAt: data.last_seen_at as string };
  }

  async upsertSession(session: SessionRecord): Promise<void> {
    const { error } = await this.client
      .from(TABLES.sessions)
      .upsert({ session_id: session.sessionId, user_id: session.userId, last_seen_at: session.lastSeenAt });
    if (error) throw error;
  }

  async saveSnapshot(report: ResearchReport): Promise<void> {
    const { error } = await this.client.from(TABLES.snapshots).upsert({ report_id: report.reportId, report });
    if (error) throw error;
  }

  async getSnapshot(reportId: string): Promise<ResearchReport | null> {
    const { data, error } = await this.client.from(TABLES.snapshots).select('report').eq('report_id', reportId).maybeSingle();
    if (error) throw error;
    return (data?.report as ResearchReport | undefined) ?? null;
  }

  async listBets(status?: StoredBet['status']): Promise<StoredBet[]> {
    let query = this.client.from(TABLES.bets).select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => mapBet(row as Record<string, unknown>));
  }

  async saveBet(bet: StoredBet): Promise<void> {
    const { error } = await this.client.from(TABLES.bets).upsert({
      id: bet.id,
      user_id: bet.userId,
      session_id: bet.sessionId,
      snapshot_id: bet.snapshotId,
      trace_id: bet.traceId,
      run_id: bet.runId,
      selection: bet.selection,
      game_id: bet.gameId,
      market_type: bet.marketType,
      line: bet.line,
      book: bet.book,
      odds: bet.odds,
      recommended_id: bet.recommendedId,
      followed_ai: bet.followedAi ?? false,
      placed_line: bet.placedLine,
      placed_price: bet.placedPrice,
      closing_line: bet.closingLine,
      closing_price: bet.closingPrice,
      clv_line: bet.clvLine,
      clv_price: bet.clvPrice,
      stake: bet.stake,
      status: bet.status,
      outcome: bet.outcome,
      settled_profit: bet.settledProfit,
      confidence: bet.confidence,
      created_at: bet.createdAt,
      settled_at: bet.settledAt,
      resolution_reason: bet.resolutionReason,
      source_url: bet.sourceUrl,
      source_domain: bet.sourceDomain,
    });
    if (error) throw error;
  }

  async getBet(betId: string): Promise<StoredBet | null> {
    const { data, error } = await this.client.from(TABLES.bets).select('*').eq('id', betId).maybeSingle();
    if (error) throw error;
    return data ? mapBet(data as Record<string, unknown>) : null;
  }

  async saveEvent(event: ControlPlaneEvent): Promise<void> {
    const { error } = await this.client.from(TABLES.events).insert(event);
    if (error) throw error;
  }

  async listEvents(query: { traceId?: string; limit?: number } = {}): Promise<ControlPlaneEvent[]> {
    let dbQuery = this.client.from(TABLES.events).select('*').order('timestamp', { ascending: false }).limit(query.limit ?? 50);
    if (query.traceId) dbQuery = dbQuery.eq('trace_id', query.traceId);
    const { data, error } = await dbQuery;
    if (error) throw error;
    return (data ?? []).map((row) => ({
      event_name: row.event_name as ControlPlaneEvent['event_name'],
      timestamp: row.timestamp as string,
      request_id: row.request_id as string,
      trace_id: row.trace_id as string,
      run_id: (row.run_id as string | null) ?? undefined,
      session_id: (row.session_id as string | null) ?? undefined,
      user_id: (row.user_id as string | null) ?? undefined,
      agent_id: row.agent_id as string,
      model_version: row.model_version as string,
      confidence: (row.confidence as number | null) ?? undefined,
      assumptions: (row.assumptions as string[] | null) ?? undefined,
      properties: (row.properties as Record<string, unknown>) ?? {},
    }));
  }

  async getIdempotencyRecord<T>(endpoint: string, userId: string, key: string): Promise<IdempotencyRecord<T> | null> {
    const { data, error } = await this.client
      .from(TABLES.idempotency)
      .select('*')
      .eq('endpoint', endpoint)
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      endpoint: data.endpoint as string,
      userId: data.user_id as string,
      key: data.key as string,
      response: data.response_json as T,
      responseHash: data.response_hash as string,
      createdAt: data.created_at as string,
    };
  }

  async saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void> {
    const { error } = await this.client.from(TABLES.idempotency).upsert({
      endpoint: record.endpoint,
      user_id: record.userId,
      key: record.key,
      response_json: record.response,
      response_hash: record.responseHash,
      created_at: record.createdAt,
    });
    if (error) throw error;
  }

  async saveRecommendation(recommendation: AgentRecommendation): Promise<void> {
    const { error } = await this.client.from(TABLES.recommendations).upsert({
      id: recommendation.id,
      parent_recommendation_id: recommendation.parentRecommendationId,
      group_id: recommendation.groupId,
      recommendation_type: recommendation.recommendationType,
      session_id: recommendation.sessionId,
      user_id: recommendation.userId,
      request_id: recommendation.requestId,
      trace_id: recommendation.traceId,
      run_id: recommendation.runId,
      agent_id: recommendation.agentId,
      agent_version: recommendation.agentVersion,
      game_id: recommendation.gameId,
      market_type: recommendation.marketType,
      market: recommendation.market,
      selection: recommendation.selection,
      line: recommendation.line,
      price: recommendation.price,
      confidence: recommendation.confidence,
      rationale: recommendation.rationale,
      evidence_refs: recommendation.evidenceRefs,
      created_at: recommendation.createdAt,
    });
    if (error) throw error;
  }

  async listRecommendationsByGame(gameId: string): Promise<AgentRecommendation[]> {
    const { data, error } = await this.client
      .from(TABLES.recommendations)
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapRecommendation(row as Record<string, unknown>));
  }

  async getRecommendation(recommendationId: string): Promise<AgentRecommendation | null> {
    const { data, error } = await this.client.from(TABLES.recommendations).select('*').eq('id', recommendationId).maybeSingle();
    if (error) throw error;
    return data ? mapRecommendation(data as Record<string, unknown>) : null;
  }

  async saveOddsSnapshot(snapshot: OddsSnapshot): Promise<void> {
    const { error } = await this.client.from(TABLES.oddsSnapshots).upsert({
      id: snapshot.id,
      game_id: snapshot.gameId,
      market: snapshot.market,
      market_type: snapshot.marketType,
      selection: snapshot.selection,
      line: snapshot.line,
      price: snapshot.price,
      book: snapshot.book,
      captured_at: snapshot.capturedAt,
      game_starts_at: snapshot.gameStartsAt,
      source_url: snapshot.sourceUrl,
      source_domain: snapshot.sourceDomain,
      fetched_at: snapshot.fetchedAt,
      published_at: snapshot.publishedAt,
      parser_version: snapshot.parserVersion,
      checksum: snapshot.checksum,
      staleness_ms: snapshot.stalenessMs,
      freshness_score: snapshot.freshnessScore,
      resolution_reason: snapshot.resolutionReason,
      consensus_level: snapshot.consensusLevel,
      sources_used: snapshot.sourcesUsed,
      disagreement_score: snapshot.disagreementScore,
    });
    if (error) throw error;
  }

  async listOddsSnapshots(gameId: string, market: string, selection: string): Promise<OddsSnapshot[]> {
    const { data, error } = await this.client
      .from(TABLES.oddsSnapshots)
      .select('*')
      .eq('game_id', gameId)
      .eq('market', market)
      .eq('selection', selection)
      .order('captured_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      gameId: row.game_id as string,
      market: row.market as string,
      marketType: row.market_type as OddsSnapshot['marketType'],
      selection: row.selection as string,
      line: row.line == null ? null : Number(row.line),
      price: row.price == null ? null : Number(row.price),
      book: row.book as string,
      capturedAt: row.captured_at as string,
      gameStartsAt: (row.game_starts_at as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
      sourceDomain: (row.source_domain as string | null) ?? null,
      fetchedAt: row.fetched_at as string,
      publishedAt: (row.published_at as string | null) ?? null,
      parserVersion: row.parser_version as string,
      checksum: row.checksum as string,
      stalenessMs: Number(row.staleness_ms ?? 0),
      freshnessScore: Number(row.freshness_score ?? 1),
      resolutionReason: (row.resolution_reason as string | null) ?? null,
      consensusLevel: (row.consensus_level as OddsSnapshot['consensusLevel']) ?? 'single_source',
      sourcesUsed: (row.sources_used as string[] | null) ?? [],
      disagreementScore: Number(row.disagreement_score ?? 0),
    }));
  }

  async saveGameResult(result: GameResultRecord): Promise<void> {
    const { error } = await this.client.from(TABLES.gameResults).upsert({
      id: result.id,
      game_id: result.gameId,
      payload: result.payload,
      completed_at: result.completedAt,
      created_at: result.createdAt,
      is_final: result.isFinal,
      source_url: result.sourceUrl,
      source_domain: result.sourceDomain,
      fetched_at: result.fetchedAt,
      published_at: result.publishedAt,
      parser_version: result.parserVersion,
      checksum: result.checksum,
      staleness_ms: result.stalenessMs,
      freshness_score: result.freshnessScore,
      consensus_level: result.consensusLevel,
      sources_used: result.sourcesUsed,
      disagreement_score: result.disagreementScore,
    });
    if (error) throw error;
  }

  async getGameResult(gameId: string): Promise<GameResultRecord | null> {
    const { data, error } = await this.client.from(TABLES.gameResults).select('*').eq('game_id', gameId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      gameId: data.game_id as string,
      payload: (data.payload as Record<string, unknown>) ?? {},
      completedAt: data.completed_at as string,
      createdAt: data.created_at as string,
      isFinal: Boolean(data.is_final),
      sourceUrl: (data.source_url as string | null) ?? null,
      sourceDomain: (data.source_domain as string | null) ?? null,
      fetchedAt: data.fetched_at as string,
      publishedAt: (data.published_at as string | null) ?? null,
      parserVersion: data.parser_version as string,
      checksum: data.checksum as string,
      stalenessMs: Number(data.staleness_ms ?? 0),
      freshnessScore: Number(data.freshness_score ?? 1),
      consensusLevel: (data.consensus_level as GameResultRecord['consensusLevel']) ?? 'single_source',
      sourcesUsed: (data.sources_used as string[] | null) ?? [],
      disagreementScore: Number(data.disagreement_score ?? 0),
    };
  }

  async saveWebCache(record: WebCacheRecord): Promise<void> {
    const { error } = await this.client.from(TABLES.webCache).upsert({
      id: record.id,
      url: record.url,
      domain: record.domain,
      fetched_at: record.fetchedAt,
      status: record.status,
      etag: record.etag,
      last_modified: record.lastModified,
      content_hash: record.contentHash,
      response_body: record.responseBody,
      expires_at: record.expiresAt,
    });
    if (error) throw error;
  }

  async getLatestWebCacheByUrl(url: string): Promise<WebCacheRecord | null> {
    const { data, error } = await this.client
      .from(TABLES.webCache)
      .select('*')
      .eq('url', url)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      url: data.url as string,
      domain: data.domain as string,
      fetchedAt: data.fetched_at as string,
      status: Number(data.status),
      etag: (data.etag as string | null) ?? null,
      lastModified: (data.last_modified as string | null) ?? null,
      contentHash: data.content_hash as string,
      responseBody: data.response_body as string,
      expiresAt: (data.expires_at as string | null) ?? null,
    };
  }


  async saveInsightNode(node: InsightNodeRecord): Promise<void> {
    const { error } = await this.client.from(TABLES.insightNodes).upsert({
      insight_id: node.insightId,
      trace_id: node.traceId,
      run_id: node.runId,
      game_id: node.gameId,
      agent_key: node.agentKey,
      track: node.track,
      insight_type: node.insightType,
      claim: node.claim,
      evidence: node.evidence,
      confidence: node.confidence,
      timestamp: node.timestamp,
      decay_half_life_minutes: node.decayHalfLifeMinutes,
      market_implied: node.marketImplied,
      model_implied: node.modelImplied,
      delta: node.delta,
    });
    if (error) throw error;
  }

  async listInsightNodesByRun(runId: string): Promise<InsightNodeRecord[]> {
    const { data, error } = await this.client.from(TABLES.insightNodes).select('*').eq('run_id', runId).order('timestamp', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      insightId: row.insight_id as string,
      traceId: row.trace_id as string,
      runId: row.run_id as string,
      gameId: row.game_id as string,
      agentKey: row.agent_key as string,
      track: row.track as InsightNodeRecord['track'],
      insightType: row.insight_type as InsightNodeRecord['insightType'],
      claim: row.claim as string,
      evidence: (row.evidence as InsightNodeRecord['evidence']) ?? [],
      confidence: Number(row.confidence),
      timestamp: row.timestamp as string,
      decayHalfLifeMinutes: Number(row.decay_half_life_minutes),
      marketImplied: row.market_implied == null ? undefined : Number(row.market_implied),
      modelImplied: row.model_implied == null ? undefined : Number(row.model_implied),
      delta: row.delta == null ? undefined : Number(row.delta),
    }));
  }

  async saveRecommendationOutcome(outcome: RecommendationOutcome): Promise<void> {
    const { error } = await this.client.from(TABLES.recommendationOutcomes).upsert({
      id: outcome.id,
      recommendation_id: outcome.recommendationId,
      game_id: outcome.gameId,
      outcome: outcome.outcome,
      closing_line: outcome.closingLine,
      closing_price: outcome.closingPrice,
      clv_line: outcome.clvLine,
      clv_price: outcome.clvPrice,
      settled_at: outcome.settledAt,
      resolution_reason: outcome.resolutionReason,
      source_url: outcome.sourceUrl,
      source_domain: outcome.sourceDomain,
    });
    if (error) throw error;
  }

  async getRecommendationOutcome(recommendationId: string): Promise<RecommendationOutcome | null> {
    const { data, error } = await this.client
      .from(TABLES.recommendationOutcomes)
      .select('*')
      .eq('recommendation_id', recommendationId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      recommendationId: data.recommendation_id as string,
      gameId: data.game_id as string,
      outcome: data.outcome as RecommendationOutcome['outcome'],
      closingLine: data.closing_line == null ? null : Number(data.closing_line),
      closingPrice: data.closing_price == null ? null : Number(data.closing_price),
      clvLine: data.clv_line == null ? null : Number(data.clv_line),
      clvPrice: data.clv_price == null ? null : Number(data.clv_price),
      settledAt: data.settled_at as string,
      resolutionReason: (data.resolution_reason as string | null) ?? null,
      sourceUrl: (data.source_url as string | null) ?? null,
      sourceDomain: (data.source_domain as string | null) ?? null,
    };
  }

  async saveExperiment(experiment: ExperimentRecord): Promise<void> {
    const { error } = await this.client
      .from(TABLES.experiments)
      .upsert({ id: experiment.id, name: experiment.name, description: experiment.description, created_at: experiment.createdAt });
    if (error) throw error;
  }

  async getExperiment(name: string): Promise<ExperimentRecord | null> {
    const { data, error } = await this.client.from(TABLES.experiments).select('*').eq('name', name).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      name: data.name as string,
      description: (data.description as string | null) ?? null,
      createdAt: data.created_at as string,
    };
  }

  async saveExperimentAssignment(assignment: ExperimentAssignment): Promise<void> {
    const { error } = await this.client.from(TABLES.experimentAssignments).upsert({
      id: assignment.id,
      experiment_name: assignment.experimentName,
      assignment: assignment.assignment,
      subject_key: assignment.subjectKey,
      user_id: assignment.userId,
      anon_session_id: assignment.anonSessionId,
      created_at: assignment.createdAt,
    });
    if (error) throw error;
  }

  async getExperimentAssignment(experimentName: string, subjectKey: string): Promise<ExperimentAssignment | null> {
    const { data, error } = await this.client
      .from(TABLES.experimentAssignments)
      .select('*')
      .eq('experiment_name', experimentName)
      .eq('subject_key', subjectKey)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      experimentName: data.experiment_name as string,
      assignment: data.assignment as ExperimentAssignment['assignment'],
      subjectKey: data.subject_key as string,
      userId: (data.user_id as string | null) ?? null,
      anonSessionId: (data.anon_session_id as string | null) ?? null,
      createdAt: data.created_at as string,
    };
  }

  async createSlipSubmission(submission: SlipSubmission): Promise<void> {
    const { error } = await this.client.from(TABLES.slipSubmissions).upsert({
      id: submission.id,
      anon_session_id: submission.anonSessionId,
      user_id: submission.userId,
      created_at: submission.createdAt,
      source: submission.source,
      raw_text: submission.rawText,
      parse_status: submission.parseStatus,
      extracted_legs: submission.extractedLegs,
      trace_id: submission.traceId,
      request_id: submission.requestId,
      checksum: submission.checksum,
    });
    if (error) throw error;
  }

  async getSlipSubmission(id: string): Promise<SlipSubmission | null> {
    const { data, error } = await this.client.from(TABLES.slipSubmissions).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      anonSessionId: (data.anon_session_id as string | null) ?? null,
      userId: (data.user_id as string | null) ?? null,
      createdAt: data.created_at as string,
      source: data.source as SlipSubmission['source'],
      rawText: data.raw_text as string,
      parseStatus: data.parse_status as SlipSubmission['parseStatus'],
      extractedLegs: (data.extracted_legs as Record<string, unknown>[] | null) ?? null,
      traceId: data.trace_id as string,
      requestId: data.request_id as string,
      checksum: data.checksum as string,
    };
  }

  async listSlipSubmissions(query: { anonSessionId?: string; userId?: string; limit?: number }): Promise<SlipSubmission[]> {
    let dbQuery = this.client.from(TABLES.slipSubmissions).select('*').order('created_at', { ascending: false }).limit(query.limit ?? 25);
    if (query.anonSessionId) dbQuery = dbQuery.eq('anon_session_id', query.anonSessionId);
    if (query.userId) dbQuery = dbQuery.eq('user_id', query.userId);
    const { data, error } = await dbQuery;
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: item.id as string,
      anonSessionId: (item.anon_session_id as string | null) ?? null,
      userId: (item.user_id as string | null) ?? null,
      createdAt: item.created_at as string,
      source: item.source as SlipSubmission['source'],
      rawText: item.raw_text as string,
      parseStatus: item.parse_status as SlipSubmission['parseStatus'],
      extractedLegs: (item.extracted_legs as Record<string, unknown>[] | null) ?? null,
      traceId: item.trace_id as string,
      requestId: item.request_id as string,
      checksum: item.checksum as string,
    }));
  }

  async updateSlipSubmission(
    id: string,
    patch: Partial<Omit<SlipSubmission, 'id' | 'createdAt'>>,
  ): Promise<SlipSubmission | null> {
    const { data, error } = await this.client
      .from(TABLES.slipSubmissions)
      .update({
        anon_session_id: patch.anonSessionId,
        user_id: patch.userId,
        source: patch.source,
        raw_text: patch.rawText,
        parse_status: patch.parseStatus,
        extracted_legs: patch.extractedLegs,
        trace_id: patch.traceId,
        request_id: patch.requestId,
        checksum: patch.checksum,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      anonSessionId: (data.anon_session_id as string | null) ?? null,
      userId: (data.user_id as string | null) ?? null,
      createdAt: data.created_at as string,
      source: data.source as SlipSubmission['source'],
      rawText: data.raw_text as string,
      parseStatus: data.parse_status as SlipSubmission['parseStatus'],
      extractedLegs: (data.extracted_legs as Record<string, unknown>[] | null) ?? null,
      traceId: data.trace_id as string,
      requestId: data.request_id as string,
      checksum: data.checksum as string,
    };
  }
}
