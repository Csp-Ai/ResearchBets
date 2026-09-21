'use client';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export function BuildDecisionCopilot({
  legs,
}: {
  legs: SlipBuilderLeg[];
  onApply: (legs: SlipBuilderLeg[]) => void;
  onAnalyze: () => void;
  traceId?: string;
  slipId?: string;
}) {
  if (legs.length === 0) return null;

  return (
    <section data-testid="build-decision-copilot">
      ResearchBets Copilot
    </section>
  );
}
