import { CANONICAL_KEYS } from '@/src/core/env/keys';

type ClientEnv = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

const trimValue = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getClientEnv = (): ClientEnv => ({
  supabaseUrl: trimValue(process.env[CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_URL]),
  supabaseAnonKey: trimValue(process.env[CANONICAL_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]),
});
