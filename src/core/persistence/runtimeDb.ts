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
  OutcomeSnapshotRecord,
  EdgeRealizedRecord,
  UserTrackedBetRecord,
  SessionRecord,
  SlipSubmission,
  StoredBet,
  WebCacheRecord
} from './runtimeStore';

export interface RuntimeDb {
  sessions: SessionRecord[];
  snapshots: ResearchReport[];
  bets: StoredBet[];
  events: ControlPlaneEvent[];
  idempotencyKeys: IdempotencyRecord<unknown>[];
  recommendations: AgentRecommendation[];
  oddsSnapshots: OddsSnapshot[];
  gameResults: GameResultRecord[];
  recommendationOutcomes: RecommendationOutcome[];
  experiments: ExperimentRecord[];
  experimentAssignments: ExperimentAssignment[];
  webCache: WebCacheRecord[];
  slipSubmissions: SlipSubmission[];
  insightNodes: InsightNodeRecord[];
  outcomeSnapshots: OutcomeSnapshotRecord[];
  edgeRealized: EdgeRealizedRecord[];
  trackedProps: UserTrackedBetRecord[];
}

export const persistenceDb: RuntimeDb = {
  sessions: [],
  snapshots: [],
  bets: [],
  events: [],
  idempotencyKeys: [],
  recommendations: [],
  oddsSnapshots: [],
  gameResults: [],
  recommendationOutcomes: [],
  experiments: [],
  experimentAssignments: [],
  webCache: [],
  slipSubmissions: [],
  insightNodes: [],
  outcomeSnapshots: [],
  edgeRealized: [],
  trackedProps: []
};

export class MemoryRuntimeStore implements RuntimeStore {
  async getSession(sessionId: string): Promise<SessionRecord | null> {
    return persistenceDb.sessions.find((session) => session.sessionId === sessionId) ?? null;
  }

  async upsertSession(session: SessionRecord): Promise<void> {
    const existingIndex = persistenceDb.sessions.findIndex(
      (item) => item.sessionId === session.sessionId
    );
    if (existingIndex >= 0) {
      persistenceDb.sessions[existingIndex] = session;
      return;
    }
    persistenceDb.sessions.push(session);
  }

  async saveSnapshot(report: ResearchReport): Promise<void> {
    const index = persistenceDb.snapshots.findIndex((item) => item.reportId === report.reportId);
    if (index >= 0) {
      persistenceDb.snapshots[index] = report;
      return;
    }
    persistenceDb.snapshots.unshift(report);
  }

  async getSnapshot(reportId: string): Promise<ResearchReport | null> {
    return persistenceDb.snapshots.find((item) => item.reportId === reportId) ?? null;
  }

  async listBets(status?: StoredBet['status']): Promise<StoredBet[]> {
    return status
      ? persistenceDb.bets.filter((bet) => bet.status === status)
      : [...persistenceDb.bets];
  }

  async saveBet(bet: StoredBet): Promise<void> {
    const existingIndex = persistenceDb.bets.findIndex((item) => item.id === bet.id);
    if (existingIndex >= 0) {
      persistenceDb.bets[existingIndex] = bet;
      return;
    }
    persistenceDb.bets.unshift(bet);
  }

  async getBet(betId: string): Promise<StoredBet | null> {
    return persistenceDb.bets.find((item) => item.id === betId) ?? null;
  }

  async saveEvent(event: ControlPlaneEvent): Promise<void> {
    persistenceDb.events.push(event);
  }

  async listEvents(query: { traceId?: string; limit?: number } = {}): Promise<ControlPlaneEvent[]> {
    const filtered = query.traceId
      ? persistenceDb.events.filter((event) => event.trace_id === query.traceId)
      : [...persistenceDb.events];
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted.slice(0, query.limit ?? 50);
  }

  async getIdempotencyRecord<T>(
    endpoint: string,
    userId: string,
    key: string
  ): Promise<IdempotencyRecord<T> | null> {
    return (
      (persistenceDb.idempotencyKeys.find(
        (item) => item.endpoint === endpoint && item.userId === userId && item.key === key
      ) as IdempotencyRecord<T> | undefined) ?? null
    );
  }

  async saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void> {
    const existingIndex = persistenceDb.idempotencyKeys.findIndex(
      (item) =>
        item.endpoint === record.endpoint &&
        item.userId === record.userId &&
        item.key === record.key
    );
    if (existingIndex >= 0) {
      persistenceDb.idempotencyKeys[existingIndex] = record;
      return;
    }
    persistenceDb.idempotencyKeys.push(record as IdempotencyRecord<unknown>);
  }

  async saveRecommendation(recommendation: AgentRecommendation): Promise<void> {
    const existingIndex = persistenceDb.recommendations.findIndex(
      (item) => item.id === recommendation.id
    );
    if (existingIndex >= 0) {
      persistenceDb.recommendations[existingIndex] = recommendation;
      return;
    }
    persistenceDb.recommendations.unshift(recommendation);
  }

  async listRecommendationsByGame(gameId: string): Promise<AgentRecommendation[]> {
    return persistenceDb.recommendations.filter(
      (recommendation) => recommendation.gameId === gameId
    );
  }

  async getRecommendation(recommendationId: string): Promise<AgentRecommendation | null> {
    return persistenceDb.recommendations.find((item) => item.id === recommendationId) ?? null;
  }

  async saveOddsSnapshot(snapshot: OddsSnapshot): Promise<void> {
    const existingIndex = persistenceDb.oddsSnapshots.findIndex((item) => item.id === snapshot.id);
    if (existingIndex >= 0) {
      persistenceDb.oddsSnapshots[existingIndex] = snapshot;
      return;
    }
    persistenceDb.oddsSnapshots.unshift(snapshot);
  }

  async listOddsSnapshots(
    gameId: string,
    market: string,
    selection: string
  ): Promise<OddsSnapshot[]> {
    return persistenceDb.oddsSnapshots
      .filter(
        (item) => item.gameId === gameId && item.market === market && item.selection === selection
      )
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }

  async saveGameResult(result: GameResultRecord): Promise<void> {
    const existingIndex = persistenceDb.gameResults.findIndex(
      (item) => item.gameId === result.gameId
    );
    if (existingIndex >= 0) {
      persistenceDb.gameResults[existingIndex] = result;
      return;
    }
    persistenceDb.gameResults.unshift(result);
  }

  async getGameResult(gameId: string): Promise<GameResultRecord | null> {
    return persistenceDb.gameResults.find((item) => item.gameId === gameId) ?? null;
  }

  async saveWebCache(record: WebCacheRecord): Promise<void> {
    const existingIndex = persistenceDb.webCache.findIndex(
      (item) => item.url === record.url && item.fetchedAt === record.fetchedAt
    );
    if (existingIndex >= 0) {
      persistenceDb.webCache[existingIndex] = record;
      return;
    }
    persistenceDb.webCache.unshift(record);
  }

  async getLatestWebCacheByUrl(url: string): Promise<WebCacheRecord | null> {
    return (
      persistenceDb.webCache
        .filter((item) => item.url === url)
        .sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())[0] ??
      null
    );
  }

  async saveInsightNode(node: InsightNodeRecord): Promise<void> {
    const existingIndex = persistenceDb.insightNodes.findIndex(
      (item) => item.insightId === node.insightId
    );
    if (existingIndex >= 0) {
      persistenceDb.insightNodes[existingIndex] = node;
      return;
    }
    persistenceDb.insightNodes.unshift(node);
  }

  async listInsightNodesByRun(runId: string): Promise<InsightNodeRecord[]> {
    return persistenceDb.insightNodes.filter((item) => item.runId === runId);
  }

  async saveOutcomeSnapshot(snapshot: OutcomeSnapshotRecord): Promise<void> {
    const existingIndex = persistenceDb.outcomeSnapshots.findIndex(
      (item) => item.gameId === snapshot.gameId
    );
    if (existingIndex >= 0) {
      persistenceDb.outcomeSnapshots[existingIndex] = snapshot;
      return;
    }
    persistenceDb.outcomeSnapshots.unshift(snapshot);
  }

  async getOutcomeSnapshot(gameId: string): Promise<OutcomeSnapshotRecord | null> {
    return persistenceDb.outcomeSnapshots.find((item) => item.gameId === gameId) ?? null;
  }

  async saveEdgeRealized(edge: EdgeRealizedRecord): Promise<void> {
    const existingIndex = persistenceDb.edgeRealized.findIndex((item) => item.id === edge.id);
    if (existingIndex >= 0) {
      persistenceDb.edgeRealized[existingIndex] = edge;
      return;
    }
    persistenceDb.edgeRealized.unshift(edge);
  }

  async listEdgeRealized(): Promise<EdgeRealizedRecord[]> {
    return [...persistenceDb.edgeRealized];
  }

  async saveTrackedProp(prop: UserTrackedBetRecord): Promise<void> {
    const existingIndex = persistenceDb.trackedProps.findIndex((item) => item.id === prop.id);
    if (existingIndex >= 0) {
      persistenceDb.trackedProps[existingIndex] = prop;
      return;
    }
    persistenceDb.trackedProps.unshift(prop);
  }

  async listTrackedProps(gameId?: string): Promise<UserTrackedBetRecord[]> {
    return gameId
      ? persistenceDb.trackedProps.filter((item) => item.gameId === gameId)
      : [...persistenceDb.trackedProps];
  }

  async saveRecommendationOutcome(outcome: RecommendationOutcome): Promise<void> {
    const existingIndex = persistenceDb.recommendationOutcomes.findIndex(
      (item) => item.recommendationId === outcome.recommendationId
    );
    if (existingIndex >= 0) {
      persistenceDb.recommendationOutcomes[existingIndex] = outcome;
      return;
    }
    persistenceDb.recommendationOutcomes.unshift(outcome);
  }

  async getRecommendationOutcome(recommendationId: string): Promise<RecommendationOutcome | null> {
    return (
      persistenceDb.recommendationOutcomes.find(
        (item) => item.recommendationId === recommendationId
      ) ?? null
    );
  }

  async saveExperiment(experiment: ExperimentRecord): Promise<void> {
    const existingIndex = persistenceDb.experiments.findIndex(
      (item) => item.name === experiment.name
    );
    if (existingIndex >= 0) {
      persistenceDb.experiments[existingIndex] = experiment;
      return;
    }
    persistenceDb.experiments.unshift(experiment);
  }

  async getExperiment(name: string): Promise<ExperimentRecord | null> {
    return persistenceDb.experiments.find((item) => item.name === name) ?? null;
  }

  async saveExperimentAssignment(assignment: ExperimentAssignment): Promise<void> {
    const existingIndex = persistenceDb.experimentAssignments.findIndex(
      (item) =>
        item.experimentName === assignment.experimentName &&
        item.subjectKey === assignment.subjectKey
    );
    if (existingIndex >= 0) {
      persistenceDb.experimentAssignments[existingIndex] = assignment;
      return;
    }
    persistenceDb.experimentAssignments.unshift(assignment);
  }

  async getExperimentAssignment(
    experimentName: string,
    subjectKey: string
  ): Promise<ExperimentAssignment | null> {
    return (
      persistenceDb.experimentAssignments.find(
        (item) => item.experimentName === experimentName && item.subjectKey === subjectKey
      ) ?? null
    );
  }

  async createSlipSubmission(submission: SlipSubmission): Promise<void> {
    const existingIndex = persistenceDb.slipSubmissions.findIndex(
      (item) => item.id === submission.id
    );
    if (existingIndex >= 0) {
      persistenceDb.slipSubmissions[existingIndex] = submission;
      return;
    }
    persistenceDb.slipSubmissions.unshift(submission);
  }

  async getSlipSubmission(id: string): Promise<SlipSubmission | null> {
    return persistenceDb.slipSubmissions.find((item) => item.id === id) ?? null;
  }

  async listSlipSubmissions(query: {
    anonSessionId?: string;
    userId?: string;
    limit?: number;
  }): Promise<SlipSubmission[]> {
    const filtered = persistenceDb.slipSubmissions.filter((item) => {
      if (query.anonSessionId && item.anonSessionId !== query.anonSessionId) return false;
      if (query.userId && item.userId !== query.userId) return false;
      return true;
    });
    return filtered.slice(0, query.limit ?? 25);
  }

  async updateSlipSubmission(
    id: string,
    patch: Partial<Omit<SlipSubmission, 'id' | 'createdAt'>>
  ): Promise<SlipSubmission | null> {
    const existing = await this.getSlipSubmission(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    await this.createSlipSubmission(updated);
    return updated;
  }
}

export const resetRuntimeDb = (): void => {
  persistenceDb.sessions.length = 0;
  persistenceDb.snapshots.length = 0;
  persistenceDb.bets.length = 0;
  persistenceDb.events.length = 0;
  persistenceDb.idempotencyKeys.length = 0;
  persistenceDb.recommendations.length = 0;
  persistenceDb.oddsSnapshots.length = 0;
  persistenceDb.gameResults.length = 0;
  persistenceDb.recommendationOutcomes.length = 0;
  persistenceDb.experiments.length = 0;
  persistenceDb.experimentAssignments.length = 0;
  persistenceDb.webCache.length = 0;
  persistenceDb.slipSubmissions.length = 0;
  persistenceDb.insightNodes.length = 0;
  persistenceDb.outcomeSnapshots.length = 0;
  persistenceDb.edgeRealized.length = 0;
  persistenceDb.trackedProps.length = 0;
};
