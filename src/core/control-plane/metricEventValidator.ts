import type { ControlPlaneEvent } from './events';

export type MetricEventValidationMode = 'off' | 'warn' | 'error';

type MetricEventSpec = {
  aliases: readonly string[];
  requiredFields: readonly string[];
};

const METRIC_EVENT_SPECS: Record<string, MetricEventSpec> = {
  decision_card_rendered: {
    aliases: ['agent_scored_decision'],
    requiredFields: ['decision_id', 'market', 'score', 'rationale', 'features']
  },
  bet_tracked: {
    aliases: ['bet_logged'],
    requiredFields: ['bet_id']
  },
  bet_settled: {
    aliases: ['bet_settled', 'user_outcome_recorded'],
    requiredFields: ['outcome_id', 'bet_id', 'settlement_status', 'pnl_amount', 'settled_at']
  },
  outcome_ingested: {
    aliases: ['game_result_ingested'],
    requiredFields: ['outcome_id', 'settled_at', 'is_final']
  },
  edge_realized: {
    aliases: ['edge_realized_logged', 'edge_realized_computed'],
    requiredFields: ['game_id']
  },
  calibration_updated: {
    aliases: ['calibration_update'],
    requiredFields: ['brier_score', 'edge_decay_rate']
  }
};

const aliasToMetricEvent = new Map<string, string>();
for (const [metricEventName, spec] of Object.entries(METRIC_EVENT_SPECS)) {
  aliasToMetricEvent.set(metricEventName, metricEventName);
  for (const alias of spec.aliases) {
    aliasToMetricEvent.set(alias, metricEventName);
  }
}

const asMetricEventValidationMode = (value: string | undefined): MetricEventValidationMode => {
  const normalized = value?.toLowerCase();
  if (normalized === 'off' || normalized === 'warn' || normalized === 'error') {
    return normalized;
  }
  return 'warn';
};

export const getMetricEventValidationMode = (): MetricEventValidationMode =>
  asMetricEventValidationMode(process.env.METRIC_EVENT_VALIDATION);

export interface MetricEventValidationResult {
  mode: MetricEventValidationMode;
  canonicalEventName: string | null;
  warnings: string[];
  shouldThrow: boolean;
}

export const validateMetricEvent = (
  event: Pick<ControlPlaneEvent, 'event_name' | 'properties'>,
  mode: MetricEventValidationMode = getMetricEventValidationMode(),
): MetricEventValidationResult => {
  const canonicalEventName = aliasToMetricEvent.get(event.event_name) ?? null;
  if (!canonicalEventName || mode === 'off') {
    return { mode, canonicalEventName, warnings: [], shouldThrow: false };
  }

  const spec = METRIC_EVENT_SPECS[canonicalEventName];
  if (!spec) {
    return { mode, canonicalEventName, warnings: [], shouldThrow: false };
  }
  const missingFields = spec.requiredFields.filter((field) => !(field in event.properties));
  if (!missingFields.length) {
    return { mode, canonicalEventName, warnings: [], shouldThrow: false };
  }

  const warnings = [
    `[metric-event-validator] ${event.event_name} (${canonicalEventName}) missing required properties: ${missingFields.join(', ')}`
  ];

  return {
    mode,
    canonicalEventName,
    warnings,
    shouldThrow: mode === 'error'
  };
};

export const metricEventSpecification = METRIC_EVENT_SPECS;
