import 'server-only';

type ServerEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  vercel: string | null;
  liveMode: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  sportsDataApiKey: string | null;
  oddsApiKey: string | null;
  cronSecret: string | null;
  missing: string[];
};

const trimEnv = (name: string): string | null => {
  const value = process.env[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getServerEnv = (): ServerEnv => {
  const nodeEnv = (process.env.NODE_ENV as ServerEnv['nodeEnv'] | undefined) ?? 'development';
  const env: ServerEnv = {
    nodeEnv,
    vercel: trimEnv('VERCEL'),
    liveMode: (trimEnv('LIVE_MODE') ?? 'false').toLowerCase() === 'true',
    supabaseUrl: trimEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: trimEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: trimEnv('SUPABASE_SERVICE_ROLE_KEY'),
    sportsDataApiKey: trimEnv('SPORTSDATAIO_API_KEY'),
    oddsApiKey: trimEnv('ODDS_API_KEY'),
    cronSecret: trimEnv('CRON_SECRET'),
    missing: []
  };

  const required = [
    ['NEXT_PUBLIC_SUPABASE_URL', env.supabaseUrl],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', env.supabaseAnonKey],
    ['SUPABASE_SERVICE_ROLE_KEY', env.supabaseServiceRoleKey]
  ] as const;

  env.missing = required.filter((entry) => !entry[1]).map((entry) => entry[0]);

  if (nodeEnv === 'development' && env.missing.length > 0) {
    throw new Error(`Missing required environment variables: ${env.missing.join(', ')}. Copy .env.example to .env.local and fill required values.`);
  }

  return env;
};
