import { getSupabaseServiceClient as getCoreServiceClient } from '@/src/core/supabase/service';
import { getSupabaseServerClient as getCoreServerClient } from '@/src/core/supabase/server';

export const getSupabaseServiceClient = getCoreServiceClient;
export const getSupabaseServerClient = getCoreServerClient;
