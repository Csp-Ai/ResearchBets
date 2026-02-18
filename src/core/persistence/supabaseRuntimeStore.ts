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
  SessionRecord,
  StoredBet,
} from './runtimeStore';

const createSupabaseClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(url, key);
};

const SESSIONS_TABLE = 'runtime_sessions';
const SNAPSHOTS_TABLE = 'research_reports';
const BETS_TABLE = 'bets';
const EVENTS_TABLE = 'events_analytics';
const IDEMPOTENCY_KEYS_TABLE = 'idempotency_keys';
const RECOMMENDATIONS_TABLE = 'ai_recommendations';
const ODDS_SNAPSHOTS_TABLE = 'odds_snapshots';
const GAME_RESULTS_TABLE = 'game_results';
const RECOMMENDATION_OUTCOMES_TABLE = 'recommendation_outcomes';
const EXPERIMENTS_TABLE = 'experiments';
const EXPERIMENT_ASSIGNMENTS_TABLE = 'experiment_assignments';

export class SupabaseRuntimeStore implements RuntimeStore {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? createSupabaseClient();
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from(SESSIONS_TABLE)
      .select('session_id, user_id, last_seen_at')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { sessionId: data.session_id as string, userId: data.user_id as string, lastSeenAt: data.last_seen_at as string };
  }

  async upsertSession(session: SessionRecord): Promise<void> {
    const { error } = await this.client
      .from(SESSIONS_TABLE)
      .upsert({ session_id: session.sessionId, user_id: session.userId, last_seen_at: session.lastSeenAt });
    if (error) throw error;
  }

  async saveSnapshot(report: ResearchReport): Promise<void> {
    const { error } = await this.client.from(SNAPSHOTS_TABLE).upsert({ report_id: report.reportId, report });
    if (error) throw error;
  }

  async getSnapshot(reportId: string): Promise<ResearchReport | null> {
    const { data, error } = await this.client.from(SNAPSHOTS_TABLE).select('report').eq('report_id', reportId).maybeSingle();
    if (error) throw error;
    return (data?.report as ResearchReport | undefined) ?? null;
  }

  async listBets(status?: StoredBet['status']): Promise<StoredBet[]> {
    let query = this.client.from(BETS_TABLE).select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: item.id as string,
      userId: item.user_id as string,
      sessionId: item.session_id as string,
      snapshotId: (item.snapshot_id as string | null) ?? '',
      traceId: (item.trace_id as string | null) ?? '',
      runId: (item.run_id as string | null) ?? '',
      selection: item.selection as string,
      gameId: (item.game_id as string | null) ?? null,
      marketType: (item.market_type as StoredBet['marketType']) ?? null,
      line: item.line == null ? null : Number(item.line),
      book: (item.book as string | null) ?? null,
      odds: Number(item.odds),
      recommendedId: (item.recommended_id as string | null) ?? null,
      followedAi: Boolean(item.followed_ai),
      placedLine: item.placed_line == null ? null : Number(item.placed_line),
      placedPrice: item.placed_price == null ? null : Number(item.placed_price),
      closingLine: item.closing_line == null ? null : Number(item.closing_line),
      closingPrice: item.closing_price == null ? null : Number(item.closing_price),
      clvLine: item.clv_line == null ? null : Number(item.clv_line),
      clvPrice: item.clv_price == null ? null : Number(item.clv_price),
      stake: Number(item.stake),
      status: item.status as StoredBet['status'],
      outcome: (item.outcome as StoredBet['outcome']) ?? null,
      settledProfit: item.settled_profit == null ? null : Number(item.settled_profit),
      confidence: Number(item.confidence ?? 0),
      createdAt: item.created_at as string,
      settledAt: (item.settled_at as string | null) ?? null,
    }));
  }

  async saveBet(bet: StoredBet): Promise<void> {
    const { error } = await this.client.from(BETS_TABLE).upsert({
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
    });
    if (error) throw error;
  }

  async getBet(betId: string): Promise<StoredBet | null> {
    const { data, error } = await this.client.from(BETS_TABLE).select('*').eq('id', betId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      userId: data.user_id as string,
      sessionId: data.session_id as string,
      snapshotId: (data.snapshot_id as string | null) ?? '',
      traceId: (data.trace_id as string | null) ?? '',
      runId: (data.run_id as string | null) ?? '',
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
    };
  }

  async saveEvent(event: ControlPlaneEvent): Promise<void> {
    const { error } = await this.client.from(EVENTS_TABLE).insert({
      event_name: event.event_name,
      trace_id: event.trace_id,
      run_id: event.run_id,
      session_id: event.session_id ?? 'unknown',
      user_id: event.user_id ?? 'anonymous',
      properties_json: { ...event.properties, request_id: event.request_id, agent_id: event.agent_id, model_version: event.model_version },
      timestamp: event.timestamp,
    });
    if (error) throw error;
  }

  async getIdempotencyRecord<T>(endpoint: string, userId: string, key: string): Promise<IdempotencyRecord<T> | null> {
    const { data, error } = await this.client
      .from(IDEMPOTENCY_KEYS_TABLE)
      .select('endpoint, user_id, key, response_hash, response_json, created_at')
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
      responseHash: data.response_hash as string,
      response: data.response_json as T,
      createdAt: data.created_at as string,
    };
  }

  async saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void> {
    const { error } = await this.client.from(IDEMPOTENCY_KEYS_TABLE).upsert({
      endpoint: record.endpoint,
      user_id: record.userId,
      key: record.key,
      response_hash: record.responseHash,
      response_json: record.response,
      created_at: record.createdAt,
    });
    if (error) throw error;
  }

  async saveRecommendation(recommendation: AgentRecommendation): Promise<void> {
    const { error } = await this.client.from(RECOMMENDATIONS_TABLE).upsert({
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
    const { data, error } = await this.client.from(RECOMMENDATIONS_TABLE).select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.mapRecommendation);
  }

  async getRecommendation(recommendationId: string): Promise<AgentRecommendation | null> {
    const { data, error } = await this.client.from(RECOMMENDATIONS_TABLE).select('*').eq('id', recommendationId).maybeSingle();
    if (error) throw error;
    return data ? this.mapRecommendation(data) : null;
  }

  async saveOddsSnapshot(snapshot: OddsSnapshot): Promise<void> {
    const { error } = await this.client.from(ODDS_SNAPSHOTS_TABLE).upsert({
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
    });
    if (error) throw error;
  }

  async listOddsSnapshots(gameId: string, market: string, selection: string): Promise<OddsSnapshot[]> {
    const { data, error } = await this.client
      .from(ODDS_SNAPSHOTS_TABLE)
      .select('*')
      .eq('game_id', gameId)
      .eq('market', market)
      .eq('selection', selection)
      .order('captured_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: item.id as string,
      gameId: item.game_id as string,
      market: item.market as string,
      marketType: item.market_type as OddsSnapshot['marketType'],
      selection: item.selection as string,
      line: item.line == null ? null : Number(item.line),
      price: item.price == null ? null : Number(item.price),
      book: item.book as string,
      capturedAt: item.captured_at as string,
      gameStartsAt: (item.game_starts_at as string | null) ?? null,
    }));
  }

  async saveGameResult(result: GameResultRecord): Promise<void> {
    const { error } = await this.client.from(GAME_RESULTS_TABLE).upsert({
      id: result.id,
      game_id: result.gameId,
      payload: result.payload,
      completed_at: result.completedAt,
      created_at: result.createdAt,
    });
    if (error) throw error;
  }

  async getGameResult(gameId: string): Promise<GameResultRecord | null> {
    const { data, error } = await this.client.from(GAME_RESULTS_TABLE).select('*').eq('game_id', gameId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      gameId: data.game_id as string,
      payload: (data.payload as Record<string, unknown>) ?? {},
      completedAt: data.completed_at as string,
      createdAt: data.created_at as string,
    };
  }

  async saveRecommendationOutcome(outcome: RecommendationOutcome): Promise<void> {
    const { error } = await this.client.from(RECOMMENDATION_OUTCOMES_TABLE).upsert({
      id: outcome.id,
      recommendation_id: outcome.recommendationId,
      game_id: outcome.gameId,
      outcome: outcome.outcome,
      closing_line: outcome.closingLine,
      closing_price: outcome.closingPrice,
      clv_line: outcome.clvLine,
      clv_price: outcome.clvPrice,
      settled_at: outcome.settledAt,
    });
    if (error) throw error;
  }

  async getRecommendationOutcome(recommendationId: string): Promise<RecommendationOutcome | null> {
    const { data, error } = await this.client.from(RECOMMENDATION_OUTCOMES_TABLE).select('*').eq('recommendation_id', recommendationId).maybeSingle();
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
    };
  }

  async saveExperiment(experiment: ExperimentRecord): Promise<void> {
    const { error } = await this.client.from(EXPERIMENTS_TABLE).upsert({
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      created_at: experiment.createdAt,
    });
    if (error) throw error;
  }

  async getExperiment(name: string): Promise<ExperimentRecord | null> {
    const { data, error } = await this.client.from(EXPERIMENTS_TABLE).select('*').eq('name', name).maybeSingle();
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
    const { error } = await this.client.from(EXPERIMENT_ASSIGNMENTS_TABLE).upsert({
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
      .from(EXPERIMENT_ASSIGNMENTS_TABLE)
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

  private mapRecommendation(data: Record<string, unknown>): AgentRecommendation {
    return {
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
    };
  }
}
