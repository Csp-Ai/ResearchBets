import type { ControlPlaneEvent } from './events';
import { ControlPlaneEventSchema } from './events';
import { persistenceDb } from '../persistence/runtimeDb';

export interface EventEmitter {
  emit(event: ControlPlaneEvent): Promise<void> | void;
}

export class InMemoryEventEmitter implements EventEmitter {
  private readonly events: ControlPlaneEvent[] = [];

  emit(event: ControlPlaneEvent): void {
    this.events.push(ControlPlaneEventSchema.parse(event));
  }

  getEvents(): ControlPlaneEvent[] {
    return [...this.events];
  }
}

export class DbEventEmitter implements EventEmitter {
  async emit(event: ControlPlaneEvent): Promise<void> {
    const validated = ControlPlaneEventSchema.parse(event);
    persistenceDb.events.push(validated);
  }
}
