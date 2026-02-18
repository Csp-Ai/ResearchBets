import type { Connector, ResearchTier, RuntimeEnvironment } from './Connector';

export interface ConnectorPolicyResult {
  selected: Connector[];
  skipped: Array<{ connectorId: string; reason: string }>;
}

export class ConnectorRegistry {
  private readonly connectors = new Map<string, Connector>();

  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  register(connector: Connector): void {
    this.connectors.set(connector.id, connector);
  }

  resolve(tier: ResearchTier, environment: RuntimeEnvironment): ConnectorPolicyResult {
    const sorted = [...this.connectors.values()].sort((a, b) => a.id.localeCompare(b.id));
    const selected: Connector[] = [];
    const skipped: Array<{ connectorId: string; reason: string }> = [];

    for (const connector of sorted) {
      if (!connector.allowedTiers.includes(tier)) {
        skipped.push({ connectorId: connector.id, reason: 'tier_policy' });
        continue;
      }

      if (!connector.allowedEnvironments.includes(environment)) {
        skipped.push({ connectorId: connector.id, reason: 'environment_policy' });
        continue;
      }

      const missing = connector.requiresEnv.filter((k) => !this.env[k]);
      if (missing.length > 0) {
        skipped.push({ connectorId: connector.id, reason: `missing_env:${missing.join(',')}` });
        continue;
      }

      selected.push(connector);
    }

    return { selected, skipped };
  }
}
