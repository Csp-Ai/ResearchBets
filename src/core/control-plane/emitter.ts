import type { ContextSpine } from '../contracts/contextSpine';
import { coerceContextSpine } from '../contracts/contextSpine';
import { ensureTraceMeta } from '../contracts/trace';
import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

import type { ControlPlaneEvent } from './events';
import { ControlPlaneEventSchema } from './events';
import { validateMetricEvent } from './metricEventValidator';

export interface EventEmitter {
  emit(event: ControlPlaneEvent, spine?: Partial<ContextSpine>): Promise<void> | void;
}

const DEFAULT_SPINE: ContextSpine = {
  sport: 'NBA',
  tz: 'America/Phoenix',
  date: new Date().toISOString().slice(0, 10),
  mode: 'demo',
};

const withEnvelope = (event: ControlPlaneEvent, spine?: Partial<ContextSpine>): ControlPlaneEvent => {
  const resolvedSpine = coerceContextSpine(
    {
      sport: spine?.sport,
      tz: spine?.tz,
      date: spine?.date,
      mode: spine?.mode,
      reason: spine?.reason,
      trace_id: spine?.trace_id ?? event.trace_id,
    },
    DEFAULT_SPINE
  );
  const trace = ensureTraceMeta(resolvedSpine, 'pipeline', event.trace_id);

  return {
    ...event,
    trace_id: trace.trace_id,
    mode: trace.mode,
    reason: trace.reason,
    sport: resolvedSpine.sport,
    tz: resolvedSpine.tz,
    date: resolvedSpine.date,
  };
};

export class InMemoryEventEmitter implements EventEmitter {
  private readonly events: ControlPlaneEvent[] = [];

  emit(event: ControlPlaneEvent, spine?: Partial<ContextSpine>): void {
    const enveloped = withEnvelope(event, spine);
    const metricValidation = validateMetricEvent(enveloped);
    metricValidation.warnings.forEach((message) => {
      console.warn(message);
    });
    if (metricValidation.shouldThrow) {
      throw new Error(metricValidation.warnings.join('; '));
    }
    this.events.push(ControlPlaneEventSchema.parse(enveloped));
  }

  getEvents(): ControlPlaneEvent[] {
    return [...this.events];
  }
}

export class DbEventEmitter implements EventEmitter {
  private readonly store: RuntimeStore;

  constructor(store: RuntimeStore = getRuntimeStore()) {
    this.store = store;
  }

  async emit(event: ControlPlaneEvent, spine?: Partial<ContextSpine>): Promise<void> {
    const enveloped = withEnvelope(event, spine);
    const metricValidation = validateMetricEvent(enveloped);
    metricValidation.warnings.forEach((message) => {
      console.warn(message);
    });
    if (metricValidation.shouldThrow) {
      throw new Error(metricValidation.warnings.join('; '));
    }
    const validated = ControlPlaneEventSchema.parse(enveloped);
    await this.store.saveEvent(validated);
  }
}

export const eventEnvelopeForTest = withEnvelope;
