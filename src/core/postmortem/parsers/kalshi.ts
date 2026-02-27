import type { ParsedSlip } from '@/src/core/postmortem/types';

const CLEAN = /\s+/g;

export function detectSlip(text: string): boolean {
  return /kalshi|market price|yes|no contract|prediction market/i.test(text);
}

export function parseSlip(text: string): ParsedSlip | null {
  if (!detectSlip(text)) return null;
  const lines = text.split('\n').map((line) => line.replace(CLEAN, ' ').trim()).filter(Boolean);
  const legs = lines
    .filter((line) => /\byes\b|\bno\b|\$[0-9]|[0-9]{1,2}¢|cents/i.test(line))
    .slice(0, 12)
    .map((line) => {
      const [market = 'Kalshi market'] = line.split(/\s+-\s+/);
      return {
        player: market,
        market: /\bno\b/i.test(line) ? 'NO contract' : 'YES contract',
        odds: line.match(/([0-9]{1,2}¢|\$[0-9]+(?:\.[0-9]+)?)/)?.[1]
      };
    });

  return { book: 'Kalshi', legs, rawText: text };
}
