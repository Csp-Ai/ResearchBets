import { z } from 'zod';

import { CANONICAL_KEYS } from '@/src/core/env/keys';

const envSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional()
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env[CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_URL],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env[CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]
});
