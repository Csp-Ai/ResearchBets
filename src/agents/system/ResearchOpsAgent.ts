import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { SUPPORTED_MARKET_TYPES, type MarketType } from '../../core/markets/marketType';

interface TaskReference {
  area: string;
  rationale: string;
  fileRefs: string[];
}

export interface UnderTestedFlow {
  flow: string;
  reason: string;
  expectedTests: string[];
  existingTests: string[];
}

export interface SuggestedTask {
  title: string;
  priority: 'high' | 'medium' | 'low';
  owners: string[];
  acceptanceCriteria: string[];
  references: TaskReference;
}

export interface RecentChange {
  sha: string;
  subject: string;
  author: string;
  committedAt: string;
}

export interface ResearchOpsReport {
  generatedAt: string;
  missingInsightTypes: MarketType[];
  underTestedFlows: UnderTestedFlow[];
  suggestedTasks: SuggestedTask[];
  recentChanges: RecentChange[];
}

const REPO_ROOT = process.cwd();
const PROP_INSIGHTS_FILE = path.join(REPO_ROOT, 'src/core/slips/propInsights.ts');
const SNAPSHOT_REPLAY_VIEW_FILE = path.join(REPO_ROOT, 'features/snapshot/SnapshotReplayView.tsx');
const TESTS_DIR = path.join(REPO_ROOT, 'tests');
const PROP_TESTS_DIR = path.join(REPO_ROOT, 'src/core/slips/__tests__');

const readFileOrEmpty = (filePath: string): string => {
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
};

const listTestFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.test.ts') || entry.endsWith('.test.tsx'))
    .map((entry) => path.join(dir, entry));
};

const parseInsightCoverage = (source: string): Set<MarketType> => {
  const covered = new Set<MarketType>();

  for (const marketType of SUPPORTED_MARKET_TYPES) {
    const keyPattern = new RegExp(`\\b${marketType}\\s*:`, 'm');
    if (keyPattern.test(source)) {
      covered.add(marketType);
    }
  }

  return covered;
};

const parseRecentChanges = (): RecentChange[] => {
  const gitDir = path.join(REPO_ROOT, '.git');
  if (!existsSync(gitDir) || !statSync(gitDir).isDirectory()) {
    return [];
  }

  const output = execSync('git log -n 3 --pretty=format:%H%x09%an%x09%cI%x09%s', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  if (!output) return [];

  return output
    .split('\n')
    .map((line) => {
      const [sha, author, committedAt, subject] = line.split('\t');
      return {
        sha: sha ?? '',
        author: author ?? 'unknown',
        committedAt: committedAt ?? '',
        subject: subject ?? 'No subject',
      };
    })
    .filter((change) => change.sha.length > 0);
};

const findMarketMentionsInTests = (marketType: MarketType): string[] => {
  const testFiles = [...listTestFiles(TESTS_DIR), ...listTestFiles(PROP_TESTS_DIR)];

  return testFiles.filter((testFile) => {
    const content = readFileOrEmpty(testFile);
    const marketPattern = new RegExp(`\\b${marketType}\\b`, 'i');
    return marketPattern.test(content);
  });
};

const buildUnderTestedFlows = (missingInsightTypes: MarketType[], replaySource: string): UnderTestedFlow[] => {
  const flows: UnderTestedFlow[] = [];

  for (const marketType of SUPPORTED_MARKET_TYPES) {
    const existingTests = findMarketMentionsInTests(marketType).map((filePath) => path.relative(REPO_ROOT, filePath));
    if (existingTests.length === 0) {
      flows.push({
        flow: `Market coverage for ${marketType.toUpperCase()}`,
        reason: `No test file references ${marketType}; snapshot and insight paths can regress silently.`,
        expectedTests: ['tests/SnapshotRender.test.tsx', 'src/core/slips/__tests__/propInsights.test.ts'],
        existingTests,
      });
    }
  }

  if (!/riskTag/.test(replaySource)) {
    flows.push({
      flow: 'Snapshot replay risk badge rendering',
      reason: 'Replay view does not include riskTag-based confidence visuals.',
      expectedTests: ['tests/SnapshotRender.test.tsx'],
      existingTests: findMarketMentionsInTests('points').map((filePath) => path.relative(REPO_ROOT, filePath)),
    });
  }

  if (missingInsightTypes.includes('pra')) {
    flows.push({
      flow: 'PRA recommendation downstream handling',
      reason: 'PRA is missing from insight logic; recommendation quality cannot be validated.',
      expectedTests: ['src/core/slips/__tests__/propInsights.test.ts', 'tests/SnapshotRender.test.tsx'],
      existingTests: findMarketMentionsInTests('pra').map((filePath) => path.relative(REPO_ROOT, filePath)),
    });
  }

  return flows;
};

const buildSuggestedTasks = (
  missingInsightTypes: MarketType[],
  underTestedFlows: UnderTestedFlow[],
  recentChanges: RecentChange[],
): SuggestedTask[] => {
  const tasks: SuggestedTask[] = [];

  if (missingInsightTypes.length > 0) {
    tasks.push({
      title: `Add insight logic for ${missingInsightTypes.map((marketType) => marketType.toUpperCase()).join(', ')}`,
      priority: 'high',
      owners: ['backend', 'agent-runtime'],
      acceptanceCriteria: [
        'buildPropLegInsight covers each missing market type with label, riskTag, and trend defaults.',
        'Snapshot replay uses generated insights without fallback coercion for those markets.',
      ],
      references: {
        area: 'insight-generation',
        rationale: 'Market types exist in canonical enum but are not represented in insight generation.',
        fileRefs: ['src/core/markets/marketType.ts', 'src/core/slips/propInsights.ts'],
      },
    });
  }

  if (underTestedFlows.length > 0) {
    tasks.push({
      title: 'Backfill tests for under-tested market flows in snapshot replay',
      priority: 'medium',
      owners: ['frontend', 'qa'],
      acceptanceCriteria: [
        'Add table-driven test assertions for each MarketType in SnapshotReplayView render tests.',
        'Add at least one regression test for risk tag text and confidence bar behavior.',
      ],
      references: {
        area: 'test-coverage',
        rationale: 'Current coverage does not explicitly assert all market variants across replay and insights.',
        fileRefs: ['tests/SnapshotRender.test.tsx', 'features/snapshot/SnapshotReplayView.tsx'],
      },
    });
  }

  const recentSubjects = recentChanges.map((change) => change.subject.toLowerCase()).join(' ');
  if (!recentSubjects.includes('researchops')) {
    tasks.push({
      title: 'Integrate ResearchOps report into admin observability surface',
      priority: 'low',
      owners: ['platform'],
      acceptanceCriteria: [
        'Expose getNextResearchOpsRecommendations behind an internal endpoint.',
        'Render top 3 recommended tasks in an admin-only dashboard card.',
      ],
      references: {
        area: 'ops-observability',
        rationale: 'Recent commits do not show a dedicated feedback loop for lifecycle integrity recommendations.',
        fileRefs: ['app/dashboard/page.tsx', 'app/api/dashboard/summary/route.ts'],
      },
    });
  }

  return tasks.slice(0, 3);
};

export const getNextResearchOpsRecommendations = async (): Promise<ResearchOpsReport> => {
  const propInsightsSource = readFileOrEmpty(PROP_INSIGHTS_FILE);
  const replaySource = readFileOrEmpty(SNAPSHOT_REPLAY_VIEW_FILE);

  const coveredInsightTypes = parseInsightCoverage(propInsightsSource);
  const missingInsightTypes = SUPPORTED_MARKET_TYPES.filter((marketType) => !coveredInsightTypes.has(marketType));

  const underTestedFlows = buildUnderTestedFlows(missingInsightTypes, replaySource);
  const recentChanges = parseRecentChanges();
  const suggestedTasks = buildSuggestedTasks(missingInsightTypes, underTestedFlows, recentChanges);

  return {
    generatedAt: new Date().toISOString(),
    missingInsightTypes,
    underTestedFlows,
    suggestedTasks,
    recentChanges,
  };
};
