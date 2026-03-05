import { describe, expect, it } from 'vitest';

import fs from 'node:fs';
import path from 'node:path';

describe('diagnostics route runtime invariants', () => {
  const routes = [
    'app/api/env/status/route.ts',
    'app/api/odds/probe/route.ts',
    'app/api/provider-health/route.ts'
  ];

  it.each(routes)('%s declares nodejs runtime', (routePath) => {
    const absolute = path.join(process.cwd(), routePath);
    const source = fs.readFileSync(absolute, 'utf8');
    expect(source).toMatch(/export const runtime\s*=\s*['\"]nodejs['\"];?/);
  });
});