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

function formatValue(value) {
  if (value.includes(' ') || value.includes('#')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function upsertEnvContent(content, updates) {
  const lines = content.length > 0 ? content.split(/\r?\n/) : [];
  const keyToIndex = new Map();

  lines.forEach((line, index) => {
    const eq = line.indexOf('=');
    if (eq <= 0) return;
    const key = line.slice(0, eq).trim();
    if (key) keyToIndex.set(key, index);
  });

  const nextLines = [...lines];

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== 'string' || value.length === 0) continue;
    const formatted = `${key}=${formatValue(value)}`;

    if (keyToIndex.has(key)) {
      nextLines[keyToIndex.get(key)] = formatted;
    } else {
      if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() !== '') {
        nextLines.push('');
      }
      nextLines.push(formatted);
      keyToIndex.set(key, nextLines.length - 1);
    }
  }

  return `${nextLines.join('\n').replace(/\n+$/g, '')}\n`;
}

export function extractSupabaseKeys(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const queue = [payload];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    const publishableKey = current.publishable_key ?? current.publishableKey;
    const anonKey = current.anon_key ?? current.anonKey ?? current.legacy_anon_key;
    const serviceRoleKey = current.service_role_key ?? current.serviceRoleKey;

    if (publishableKey || anonKey || serviceRoleKey) {
      return {
        publishableKey: typeof publishableKey === 'string' ? publishableKey : undefined,
        anonKey: typeof anonKey === 'string' ? anonKey : undefined,
        serviceRoleKey: typeof serviceRoleKey === 'string' ? serviceRoleKey : undefined
      };
    }

    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        queue.push(...value);
      } else if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return {};
}
