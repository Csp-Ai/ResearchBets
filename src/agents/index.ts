import { ExampleAgent } from './example/ExampleAgent';
import { ResearchSnapshotAgent } from './researchSnapshot/ResearchSnapshotAgent';
export { getNextResearchOpsRecommendations } from './system/ResearchOpsAgent';

export const agentRegistry = {
  [ExampleAgent.id]: ExampleAgent,
  [ResearchSnapshotAgent.id]: ResearchSnapshotAgent,
};
