import { getClientEnv } from '@/src/core/env/client';
import { getServerEnv } from '@/src/core/env/server';

export const getSupabasePublicEnv = (): { url: string | null; anonKey: string | null } => {
  const clientEnv = getClientEnv();
  return {
    url: clientEnv.supabaseUrl,
    anonKey: clientEnv.supabaseAnonKey
  };
};

export const getRequiredSupabaseServiceEnv = (): { url: string; serviceRoleKey: string } => {
  const env = getServerEnv();

  if (!env.supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase server client initialization.');
  }

  if (!env.supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for Supabase server client initialization.');
  }

  return { url: env.supabaseUrl, serviceRoleKey: env.supabaseServiceRoleKey };
};
