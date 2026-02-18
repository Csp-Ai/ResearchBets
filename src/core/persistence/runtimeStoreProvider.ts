import { MemoryRuntimeStore } from './runtimeDb';
import type { RuntimeStore } from './runtimeStore';
import { SupabaseRuntimeStore } from './supabaseRuntimeStore';

let singleton: RuntimeStore | null = null;

const resolveBackend = (env: NodeJS.ProcessEnv): 'memory' | 'supabase' => {
  if (env.NODE_ENV === 'test') {
    return 'memory';
  }

  if (env.NODE_ENV === 'production') {
    return 'supabase';
  }

  return env.DEV_PERSISTENCE_BACKEND === 'memory' ? 'memory' : 'supabase';
};

export const getRuntimeStore = (env: NodeJS.ProcessEnv = process.env): RuntimeStore => {
  const backend = resolveBackend(env);

  if (backend === 'memory') {
    return new MemoryRuntimeStore();
  }

  if (!singleton) {
    singleton = new SupabaseRuntimeStore();
  }

  return singleton;
};
