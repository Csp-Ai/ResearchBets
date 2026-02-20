import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabasePublicEnv } from './env';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const getConfiguredClient = (cookieStore: CookieStore) => {
  const { url, anonKey } = getSupabasePublicEnv();

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase server client initialization.');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      }
    }
  });
};

export const getSupabaseServerClient = async () => getConfiguredClient(await cookies());
