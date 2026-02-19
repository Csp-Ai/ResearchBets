import { describe, expect, it } from 'vitest';

import {
  extractSupabaseKeys,
  normalizeEnvFile,
  sanitizeProjectRef,
  upsertEnvContent
} from './supabase-setup-helper.mjs';

describe('sanitizeProjectRef', () => {
  it('trims quotes, whitespace, zero-width chars and CRLF artifacts', () => {
    const raw = '  "\u200bgbkjalflukfkixsrjfiq\r\n"  ';
    expect(sanitizeProjectRef(raw)).toBe('gbkjalflukfkixsrjfiq');
  });
});

describe('normalizeEnvFile/upsertEnvContent', () => {
  it('is idempotent with stable ordering', () => {
    const initial = 'OTHER_KEY=keep\nNEXT_PUBLIC_SUPABASE_ANON_KEY=old\nNEXT_PUBLIC_SUPABASE_URL=https://old.supabase.co\n';
    const updates = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://new.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'sb_publishable',
      DATABASE_URL: 'postgresql://user:pass@host/db',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'jwt.jwt.jwt'
    };

    const first = upsertEnvContent(initial, updates);
    const second = upsertEnvContent(first, updates);

    expect(first).toContain('# Supabase public vars');
    expect(first).toContain('NEXT_PUBLIC_SUPABASE_URL=https://new.supabase.co');
    expect(first).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable');
    expect(first).toContain('DATABASE_URL="postgresql://user:pass@host/db"');
    expect(second).toBe(first);
  });

  it('removes duplicate keys and keeps last value', () => {
    const normalized = normalizeEnvFile('NEXT_PUBLIC_SUPABASE_URL=https://old\nNEXT_PUBLIC_SUPABASE_URL=https://new\n');
    expect(normalized.match(/NEXT_PUBLIC_SUPABASE_URL=/g)).toHaveLength(1);
    expect(normalized).toContain('NEXT_PUBLIC_SUPABASE_URL=https://new');
  });
});

describe('extractSupabaseKeys', () => {
  it('prefers publishable and includes anon fallback', () => {
    const keys = extractSupabaseKeys([
      { name: 'anon', api_key: 'anon.jwt.jwt' },
      { name: 'publishable', api_key: 'sb_pub' }
    ]);

    expect(keys.publishableKey).toBe('sb_pub');
    expect(keys.anonKey).toBe('anon.jwt.jwt');
  });
});
