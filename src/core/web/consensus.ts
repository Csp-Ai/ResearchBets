import type { EventEmitter } from '../control-plane/emitter';

import { walConfig } from './config';
import { acquireWebData } from './index';
import type { SearchSource } from './search';
import type { WalDataType, WalNormalizedRecord } from './types';

const trustWeight: Record<SearchSource['trust'], number> = {
  official: 1,
  book: 0.8,
  aggregator: 0.6,
};

const historicalAgreement = new Map<string, number>();

const sourceScore = (source: SearchSource): number => {
  const domainTrust = walConfig.domainTrust[source.domain] ?? trustWeight[source.trust];
  const agreement = historicalAgreement.get(source.domain) ?? 0.5;
  return domainTrust * 0.7 + agreement * 0.3;
};

const avg = (values: number[]): number => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
};

const evaluateResultsConsensus = (records: WalNormalizedRecord[]): { consensusLevel: WalNormalizedRecord['consensusLevel']; disagreementScore: number; isFinal: boolean } => {
  const byScore = new Map<string, number>();
  for (const record of records) {
    const home = Number(record.payload?.home_score ?? 'NaN');
    const away = Number(record.payload?.away_score ?? 'NaN');
    if (!Number.isFinite(home) || !Number.isFinite(away)) continue;
    const key = `${home}:${away}`;
    byScore.set(key, (byScore.get(key) ?? 0) + 1);
  }

  const topAgreement = Math.max(...Array.from(byScore.values()), 0);
  const disagreementScore = records.length === 0 ? 1 : Number((1 - topAgreement / records.length).toFixed(6));
  const consensusLevel =
    topAgreement >= 3
      ? 'three_source_agree'
      : topAgreement >= 2
        ? 'two_source_agree'
        : records.length > 1
          ? 'conflict'
          : 'single_source';
  const isFinal = consensusLevel !== 'conflict' && topAgreement >= walConfig.consensusMinSources;

  return { consensusLevel, disagreementScore, isFinal };
};

const evaluateOddsConsensus = (records: WalNormalizedRecord[]): { line: number | null; price: number | null; disagreementScore: number; consensusLevel: WalNormalizedRecord['consensusLevel'] } => {
  const lines = records.map((record) => record.line).filter((value): value is number => value != null);
  const prices = records.map((record) => record.price).filter((value): value is number => value != null);
  const lineMedian = median(lines);
  const priceMedian = median(prices);
  const lineDisagreement = lineMedian == null || lines.length === 0 ? 0 : avg(lines.map((line) => Math.abs(line - lineMedian)));
  const priceDisagreement = priceMedian == null || prices.length === 0 ? 0 : avg(prices.map((price) => Math.abs(price - priceMedian)));
  const disagreementScore = Number((lineDisagreement + priceDisagreement / 100).toFixed(6));

  const consensusLevel =
    records.length >= 3 ? 'three_source_agree' : records.length === 2 ? 'two_source_agree' : records.length > 1 ? 'conflict' : 'single_source';

  return { line: lineMedian, price: priceMedian, disagreementScore, consensusLevel };
};

export const acquireConsensusRecord = async ({
  sources,
  dataType,
  requestContext,
  emitter,
  store,
}: {
  sources: SearchSource[];
  dataType: WalDataType;
  requestContext: { requestId: string; traceId: string; runId: string; sessionId: string; userId: string; agentId: string; modelVersion: string };
  emitter: EventEmitter;
  store: Parameters<typeof acquireWebData>[0]['store'];
}): Promise<WalNormalizedRecord | null> => {
  const rankedSources = [...sources].sort((a, b) => sourceScore(b) - sourceScore(a)).slice(0, 3);
  const maxStalenessMs = dataType === 'results' ? walConfig.resultsStalenessMs : walConfig.oddsStalenessMs;
  const fetched: WalNormalizedRecord[] = [];

  for (const source of rankedSources) {
    const response = await acquireWebData({
      request: { url: source.url, dataType, parserHint: 'json', maxStalenessMs },
      requestContext,
      emitter,
      store,
    });
    if (response.records[0]) fetched.push(response.records[0]);
  }

  if (fetched.length === 0) return null;

  const sourcesUsed = fetched.map((item) => item.sourceDomain);

  if (dataType === 'results') {
    const consensus = evaluateResultsConsensus(fetched);
    const first = fetched[0]!;
    const result = {
      ...first,
      consensusLevel: consensus.consensusLevel,
      sourcesUsed,
      disagreementScore: consensus.disagreementScore,
      isFinal: walConfig.resultsRequireConsensus ? consensus.isFinal && Boolean(first.isFinal) : Boolean(first.isFinal),
    };

    await emitter.emit({
      event_name: 'consensus_evaluated',
      timestamp: new Date().toISOString(),
      request_id: requestContext.requestId,
      trace_id: requestContext.traceId,
      run_id: requestContext.runId,
      session_id: requestContext.sessionId,
      user_id: requestContext.userId,
      agent_id: requestContext.agentId,
      model_version: requestContext.modelVersion,
      properties: { data_type: dataType, consensus_level: result.consensusLevel, sources_used: result.sourcesUsed, disagreement_score: result.disagreementScore },
    });

    if (walConfig.resultsRequireConsensus && !result.isFinal) {
      await emitter.emit({
        event_name: 'consensus_conflict',
        timestamp: new Date().toISOString(),
        request_id: requestContext.requestId,
        trace_id: requestContext.traceId,
        run_id: requestContext.runId,
        session_id: requestContext.sessionId,
        user_id: requestContext.userId,
        agent_id: requestContext.agentId,
        model_version: requestContext.modelVersion,
        properties: { data_type: dataType, settlement_blocked: true, sources_used: result.sourcesUsed, disagreement_score: result.disagreementScore },
      });
    }

    return result;
  }

  const oddsConsensus = evaluateOddsConsensus(fetched);
  const base = fetched[0]!;
  const result = {
    ...base,
    line: oddsConsensus.line,
    price: oddsConsensus.price,
    consensusLevel: oddsConsensus.consensusLevel,
    sourcesUsed,
    disagreementScore: oddsConsensus.disagreementScore,
  };

  await emitter.emit({
    event_name: 'consensus_evaluated',
    timestamp: new Date().toISOString(),
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    run_id: requestContext.runId,
    session_id: requestContext.sessionId,
    user_id: requestContext.userId,
    agent_id: requestContext.agentId,
    model_version: requestContext.modelVersion,
    properties: { data_type: dataType, consensus_level: result.consensusLevel, sources_used: result.sourcesUsed, disagreement_score: result.disagreementScore },
  });

  return result;
};
