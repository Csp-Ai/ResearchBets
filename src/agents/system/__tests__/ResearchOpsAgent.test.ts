import { describe, expect, it } from 'vitest';

import { getNextResearchOpsRecommendations } from '../ResearchOpsAgent';

describe('ResearchOpsAgent', () => {
  it('returns a structured report with recommendation sections', async () => {
    const report = await getNextResearchOpsRecommendations();

    expect(report.generatedAt).toBeTruthy();
    expect(Array.isArray(report.missingInsightTypes)).toBe(true);
    expect(Array.isArray(report.underTestedFlows)).toBe(true);
    expect(Array.isArray(report.suggestedTasks)).toBe(true);
    expect(Array.isArray(report.recentChanges)).toBe(true);
  });

  it('limits suggested tasks to top roadmap items', async () => {
    const report = await getNextResearchOpsRecommendations();

    expect(report.suggestedTasks.length).toBeLessThanOrEqual(3);
  });
});
