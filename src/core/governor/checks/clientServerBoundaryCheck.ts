import { readFileSync } from 'node:fs';

import type { GovernorCheck } from '@/src/core/governor/types';

export const clientServerBoundaryCheck = (violations: string[]): GovernorCheck => ({
  id: 'ClientServerBoundaryCheck',
  level: violations.length === 0 ? 'info' : 'error',
  pass: violations.length === 0,
  message: violations.length === 0
    ? 'No client imports of server-only modules detected.'
    : `Detected client/server boundary violations: ${violations.join(', ')}`,
});

export const fileLooksClient = (path: string): boolean => {
  const text = readFileSync(path, 'utf8');
  return text.includes("'use client'") || text.includes('"use client"');
};
