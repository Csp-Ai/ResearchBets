import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GuidedActionsCard } from '../GuidedActionsCard';
import { ProgressStrip } from '../ProgressStrip';

describe('Guided research cockpit', () => {
  it('shows step 1 CTA when no legs', () => {
    const html = renderToStaticMarkup(
      <GuidedActionsCard
        legsCount={0}
        onPasteSlip={() => undefined}
        onRunResearch={() => undefined}
        onOpenTrace={() => undefined}
      />,
    );

    expect(html).toContain('Step 1 · Add legs');
    expect(html).toContain('Paste slip');
    expect(html).toContain('disabled');
  });

  it('shows no evidence copy for empty progress', () => {
    const html = renderToStaticMarkup(<ProgressStrip events={[]} />);
    expect(html).toContain('No evidence yet — run research to generate a trace.');
  });

  it('shows evidence metrics when trace events exist', () => {
    const html = renderToStaticMarkup(
      <ProgressStrip events={[{ event_name: 'agent_scored_decision', trace_id: 't1', created_at: new Date().toISOString(), payload: { warning: true } }]} />,
    );
    expect(html).toContain('Events: 1');
    expect(html).toContain('Warnings: 1');
  });
});
