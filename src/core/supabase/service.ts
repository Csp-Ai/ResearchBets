import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { getRequiredSupabaseServiceEnv } from './env';

export const getSupabaseServiceClient = () => {
  const { url, serviceRoleKey } = getRequiredSupabaseServiceEnv();
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
};
