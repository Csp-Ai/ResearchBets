const REQUIRED_EXACT = ['NEXT_PUBLIC_SUPABASE_URL'];
const ANY_OF_GROUPS = [['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']];

const DUMMY_DEFAULTS = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://dummy-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy-anon-key',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'dummy-publishable-key'
};

const isSet = (value) => typeof value === 'string' && value.trim().length > 0;
const isDummyValue = (value) => typeof value === 'string' && /^dummy([_-]|$)/i.test(value.trim());

export function evaluateEnvCheck(env = process.env) {
  const isProduction = env.NODE_ENV === 'production' || isSet(env.VERCEL);
  const allowDummyEnv = !isProduction && env.NODE_ENV === 'development' && env.ALLOW_DUMMY_ENV === 'true';

  if (allowDummyEnv) {
    for (const [key, value] of Object.entries(DUMMY_DEFAULTS)) {
      if (!isSet(env[key])) {
        env[key] = value;
      }
    }
  }

  const missingExact = REQUIRED_EXACT.filter((key) => !isSet(env[key]));
  const missingGroups = ANY_OF_GROUPS.filter((group) => group.every((key) => !isSet(env[key])));

  const resolvedKeys = [
    ...REQUIRED_EXACT,
    ...ANY_OF_GROUPS.map((group) => group.find((key) => isSet(env[key])) ?? group[0])
  ];
  const usingDummyValues = resolvedKeys.filter((key) => isDummyValue(env[key]));

  return {
    allowDummyEnv,
    missingExact,
    missingGroups,
    usingDummyValues
  };
}

export { ANY_OF_GROUPS, REQUIRED_EXACT };
