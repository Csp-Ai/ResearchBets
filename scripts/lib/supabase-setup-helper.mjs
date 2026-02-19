import fs from 'node:fs';
export function sanitizeProjectRef(input) {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n]/g, '')
    .trim()
    .replace(/^['\"]+|['\"]+$/g, '');
}

function stripWrappingQuotes(value) {
  return value.replace(/^['\"]|['\"]$/g, '');
}

export function parseEnvContent(content) {
  const values = new Map();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const rawValue = line.slice(eq + 1).trim();
    values.set(key, stripWrappingQuotes(rawValue));
  }

  return values;
}

const CANONICAL_GROUPS = {
  supabasePublic: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_KEY'
  ],
  server: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_TOKEN'],
  db: ['DATABASE_URL', 'DIRECT_URL']
};

function formatValue(key, value) {
  const trimmed = value.trim();
  const shouldQuote = key === 'DATABASE_URL' || key === 'DIRECT_URL' || trimmed.startsWith('postgresql://');
  if (shouldQuote) return `"${trimmed.replace(/"/g, '\\"')}"`;
  return trimmed;
}

function parseEnvEntries(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headerComments = [];
  const keyValues = new Map();
  let seenKey = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      if (!seenKey) headerComments.push(trimmed);
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    seenKey = true;
    const key = line.slice(0, eq).trim();
    const rawValue = stripWrappingQuotes(line.slice(eq + 1).trim());
    keyValues.set(key, rawValue);
  }

  return { headerComments, keyValues };
}

export function normalizeEnvFile(content) {
  const { headerComments, keyValues } = parseEnvEntries(content);
  const knownKeys = new Set(Object.values(CANONICAL_GROUPS).flat());
  const lines = [];

  if (headerComments.length > 0) {
    lines.push(...headerComments);
    lines.push('');
  }

  const sections = [
    ['# Supabase public vars', CANONICAL_GROUPS.supabasePublic],
    ['# Server vars', CANONICAL_GROUPS.server],
    ['# DB urls', CANONICAL_GROUPS.db],
    ['# Misc', [...keyValues.keys()].filter((key) => !knownKeys.has(key)).sort()]
  ];

  for (const [label, keys] of sections) {
    const materialized = keys.filter((key) => keyValues.has(key));
    if (materialized.length === 0) continue;
    if (lines.length > 0 && lines.at(-1) !== '') lines.push('');
    lines.push(label);
    for (const key of materialized) {
      lines.push(`${key}=${formatValue(key, keyValues.get(key) ?? '')}`);
    }
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/g, '')}\n`;
}

export function upsertEnvContent(content, updates) {
  const { keyValues } = parseEnvEntries(content);
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== 'string' || value.length === 0) continue;
    keyValues.set(key, value);
  }

  const merged = [...keyValues.entries()].map(([key, value]) => `${key}=${value}`).join('\n');
  return normalizeEnvFile(merged);
}

function tokenLike(value) {
  return typeof value === 'string' && value.trim().length > 20;
}

export function getSupabaseTokenFromStore(env = process.env) {
  const direct = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_TOKEN;
  if (tokenLike(direct)) return direct.trim();

  const homedir = env.HOME || env.USERPROFILE;
  const candidates = [
    homedir ? `${homedir}/.supabase/access-token` : null,
    homedir ? `${homedir}/.config/supabase/access-token` : null,
    env.APPDATA ? `${env.APPDATA}\\supabase\\access-token` : null,
    env.LOCALAPPDATA ? `${env.LOCALAPPDATA}\\supabase\\access-token` : null
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8').trim();
      if (tokenLike(raw)) return raw;
    } catch {
      // noop
    }
  }

  return '';
}

function keyFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  return row.api_key ?? row.key ?? row.value ?? '';
}

export function extractSupabaseKeys(payload) {
  if (!Array.isArray(payload)) return {};
  const publishableCandidate = payload.find((row) => {
    const label = `${row?.name ?? ''} ${row?.type ?? ''}`.toLowerCase();
    return label.includes('publishable') || label.includes('public');
  });
  const anonCandidate = payload.find((row) => {
    const label = `${row?.name ?? ''} ${row?.type ?? ''}`.toLowerCase();
    return label.includes('anon');
  });
  const serviceRoleCandidate = payload.find((row) => {
    const label = `${row?.name ?? ''} ${row?.type ?? ''}`.toLowerCase();
    return label.includes('service_role') || label.includes('service role');
  });

  const anonKey = keyFromRow(anonCandidate);
  const publishableKey = keyFromRow(publishableCandidate) || anonKey;

  return {
    publishableKey: publishableKey || undefined,
    anonKey: anonKey || undefined,
    serviceRoleKey: keyFromRow(serviceRoleCandidate) || undefined
  };
}
