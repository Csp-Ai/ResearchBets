import type { Connector, ConnectorExecutionContext, ResearchTier } from './Connector';

export interface ConnectorPolicyResult {
  selected: Connector[];
  skipped: Array<{ connectorId: string; reason: string }>;
}

interface ConnectorRegistryOptions {
  env?: Record<string, string | undefined>;
}

export class ConnectorRegistry {
  private readonly connectors = new Map<string, Connector>();
  private readonly env: Record<string, string | undefined>;

  constructor(options?: ConnectorRegistryOptions) {
    this.env = options?.env ?? process.env;
  }

  register(connector: Connector): void {
    this.connectors.set(connector.id, connector);
  }

  resolve(tier: ResearchTier, context: Pick<ConnectorExecutionContext, 'environment'>): ConnectorPolicyResult {
    const all = [...this.connectors.values()].sort((left, right) => left.id.localeCompare(right.id));

    const selected: Connector[] = [];
    const skipped: Array<{ connectorId: string; reason: string }> = [];

    for (const connector of all) {
      if (!connector.allowedTiers.includes(tier)) {
        skipped.push({ connectorId: connector.id, reason: 'tier_policy' });
        continue;
      }

      if (!connector.allowedEnvironments.includes(context.environment)) {
        skipped.push({ connectorId: connector.id, reason: 'environment_policy' });
        continue;
      }

      const missingEnv = connector.requiredEnv.filter((envKey) => !this.env[envKey]);
      if (missingEnv.length > 0) {
        skipped.push({ connectorId: connector.id, reason: `missing_env:${missingEnv.join(',')}` });
        continue;
      }

      selected.push(connector);
    }

    return { selected, skipped };
  }
}
