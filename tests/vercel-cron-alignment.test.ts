import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('vercel today warm cron alignment', () => {
  it('keeps hobby-safe daily schedule for /api/today/warm', () => {
    const raw = readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8');
    const config = JSON.parse(raw) as { crons?: Array<{ path?: string; schedule?: string }> };
    const warmCron = config.crons?.find((entry) => entry.path === '/api/today/warm');
    expect(warmCron?.schedule).toBe('0 14 * * *');
  });
});
