import type { RuntimeStore } from '../persistence/runtimeStore';
import { getRuntimeStore } from '../persistence/runtimeStoreProvider';

import type { ControlPlaneEvent } from './events';
import { ControlPlaneEventSchema } from './events';
import { validateMetricEvent } from './metricEventValidator';

export interface EventEmitter {
  emit(event: ControlPlaneEvent): Promise<void> | void;
}

export class InMemoryEventEmitter implements EventEmitter {
  private readonly events: ControlPlaneEvent[] = [];

  emit(event: ControlPlaneEvent): void {
    const metricValidation = validateMetricEvent(event);
    metricValidation.warnings.forEach((message) => {
      console.warn(message);
    });
    if (metricValidation.shouldThrow) {
      throw new Error(metricValidation.warnings.join('; '));
    }
    this.events.push(ControlPlaneEventSchema.parse(event));
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

  async emit(event: ControlPlaneEvent): Promise<void> {
    const metricValidation = validateMetricEvent(event);
    metricValidation.warnings.forEach((message) => {
      console.warn(message);
    });
    if (metricValidation.shouldThrow) {
      throw new Error(metricValidation.warnings.join('; '));
    }
    const validated = ControlPlaneEventSchema.parse(event);
    await this.store.saveEvent(validated);
  }
}
