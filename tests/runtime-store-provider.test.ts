import { describe, expect, it } from 'vitest';

import { getRuntimeStore } from '../src/core/persistence/runtimeStoreProvider';
import { MemoryRuntimeStore } from '../src/core/persistence/runtimeDb';

describe('runtime store provider durability', () => {
  it('uses supabase in production', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
    const store = getRuntimeStore({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);
    expect(store).not.toBeInstanceOf(MemoryRuntimeStore);
  });

  it('uses memory in tests only', () => {
    const store = getRuntimeStore({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    expect(store).toBeInstanceOf(MemoryRuntimeStore);
  });
});
