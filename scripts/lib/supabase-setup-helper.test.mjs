import { describe, expect, it } from 'vitest';

import { sanitizeProjectRef, upsertEnvContent } from './supabase-setup-helper.mjs';

describe('sanitizeProjectRef', () => {
  it('trims quotes, whitespace, zero-width chars and CRLF artifacts', () => {
    const raw = '  "\u200bgbkjalflukfkixsrjfiq\r\n"  ';
    expect(sanitizeProjectRef(raw)).toBe('gbkjalflukfkixsrjfiq');
  });
});

describe('upsertEnvContent', () => {
  it('updates existing keys and is idempotent', () => {
    const initial = '# comment\nNEXT_PUBLIC_SUPABASE_URL=https://old.supabase.co\n\nOTHER_KEY=keep\n';
    const updates = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://new.supabase.co',
      EXPO_PUBLIC_SUPABASE_URL: 'https://new.supabase.co'
    };

    const first = upsertEnvContent(initial, updates);
    const second = upsertEnvContent(first, updates);

    expect(first).toContain('NEXT_PUBLIC_SUPABASE_URL=https://new.supabase.co');
    expect(first).toContain('EXPO_PUBLIC_SUPABASE_URL=https://new.supabase.co');
    expect(first).toContain('OTHER_KEY=keep');
    expect(second).toBe(first);
  });
});
