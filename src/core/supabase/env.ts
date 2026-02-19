const readEnv = (name: string): string | null => {
  const value = process.env[name];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getSupabasePublicEnv = (): { url: string | null; anonKey: string | null } => ({
  url: readEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
});

export const getRequiredSupabaseServiceEnv = (): { url: string; serviceRoleKey: string } => {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase server client initialization.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for Supabase server client initialization.');
  }

  return { url, serviceRoleKey };
};
