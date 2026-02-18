'use client';

import React from 'react';

export type DecisionCardData = {
  title?: string;
  marketImplied?: number | null;
  modelImplied?: number | null;
  delta?: number | null;
  confidence?: number | null;
  volatilityTag?: string | null;
  volatilityReasons?: string[];
  fragilityVariables?: string[];
  evidenceSources?: string[];
};

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const cleanList = (values?: string[]): string[] =>
  (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

export function DecisionCard({ data }: { data: DecisionCardData }) {
  const marketImplied = isFiniteNumber(data.marketImplied) ? data.marketImplied : null;
  const modelImplied = isFiniteNumber(data.modelImplied) ? data.modelImplied : null;
  const delta = isFiniteNumber(data.delta) ? data.delta : null;
  const confidence = isFiniteNumber(data.confidence) ? data.confidence : null;
  const volatilityReasons = cleanList(data.volatilityReasons);
  const fragilityVariables = cleanList(data.fragilityVariables);
  const evidenceSources = cleanList(data.evidenceSources);

  const hasCoreEvidence = marketImplied !== null && modelImplied !== null && delta !== null;

  return (
    <article className="rounded border border-slate-800 bg-slate-950 p-3 text-sm" data-testid="decision-card">
      <h3 className="text-sm font-semibold">{data.title ?? 'Decision artifact'}</h3>

      {hasCoreEvidence ? (
        <>
          <p>
            Market implied vs model implied: {pct(marketImplied)} vs {pct(modelImplied)}
          </p>
          <p title="Delta is not a pick. It reflects market-model probability difference only.">
            Delta (not a pick): {delta >= 0 ? '+' : ''}
            {(delta * 100).toFixed(2)}%
          </p>
        </>
      ) : (
        <p className="text-slate-400">Insufficient evidence to render decision details.</p>
      )}

      <p>Confidence: {confidence === null ? 'Insufficient evidence' : pct(confidence)}</p>

      <p>Volatility: {data.volatilityTag?.trim() ? data.volatilityTag : 'Insufficient evidence'}</p>
      {volatilityReasons.length > 0 ? (
        <p>Reasons: {volatilityReasons.join(', ')}</p>
      ) : (
        <p className="text-slate-400">Reasons: Insufficient evidence</p>
      )}

      {fragilityVariables.length > 0 ? (
        <p>Fragility variables: {fragilityVariables.join(', ')}</p>
      ) : (
        <p className="text-slate-400">Fragility variables: Insufficient evidence</p>
      )}

      {evidenceSources.length > 0 ? (
        <p>Evidence sources: {evidenceSources.join(', ')}</p>
      ) : null}

      <p className="mt-2 text-xs text-slate-500">
        Delta is not a pick. It reflects market-model probability difference only.
      </p>
    </article>
  );
}
