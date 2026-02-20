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
  supabaseUrl: trimValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: trimValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
});
