import { ExampleAgent } from './example/ExampleAgent';
import { ResearchSnapshotAgent } from './researchSnapshot/ResearchSnapshotAgent';

export const agentRegistry = {
  [ExampleAgent.id]: ExampleAgent,
  [ResearchSnapshotAgent.id]: ResearchSnapshotAgent,
};
