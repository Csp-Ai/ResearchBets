import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DecisionCard } from '../src/components/DecisionCard';

describe('DecisionCard', () => {
  it('renders complete decision artifact fields', () => {
    const html = renderToStaticMarkup(
      <DecisionCard
        data={{
          title: 'Terminal Decision Artifact',
          marketImplied: 0.44,
          modelImplied: 0.52,
          delta: 0.08,
          confidence: 0.67,
          volatilityTag: 'swingy',
          volatilityReasons: ['line move', 'injury uncertainty'],
          fragilityVariables: ['pace', 'usage'],
          evidenceSources: ['live', 'model-v1']
        }}
      />
    );

    expect(html).toContain('Market implied vs model implied: 44.0% vs 52.0%');
    expect(html).toContain('Delta (not a pick): +8.00%');
    expect(html).toContain('Confidence: 67.0%');
    expect(html).toContain('Volatility: swingy');
    expect(html).toContain('Reasons: line move, injury uncertainty');
    expect(html).toContain('Fragility variables: pace, usage');
    expect(html).toContain('Evidence sources: live, model-v1');
    expect(html).toContain('Delta is not a pick. It reflects market-model probability difference only.');
    expect(html).toMatchSnapshot();
  });

  it('renders insufficient evidence fallback when fields are missing', () => {
    const html = renderToStaticMarkup(<DecisionCard data={{ title: 'Decision artifact' }} />);

    expect(html).toContain('Insufficient evidence to render decision details.');
    expect(html).toContain('Confidence: Insufficient evidence');
    expect(html).toContain('Volatility: Insufficient evidence');
    expect(html).toContain('Reasons: Insufficient evidence');
    expect(html).toContain('Fragility variables: Insufficient evidence');
  });
});
