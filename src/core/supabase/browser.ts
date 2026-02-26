'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

const getPublicEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
  return { url, anonKey };
};

export const getSupabaseBrowserClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client is only available in the browser runtime.');
  }

  if (browserClient) return browserClient;

  const { url, anonKey } = getPublicEnv();
  if (!url || !anonKey) return null;

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
};
