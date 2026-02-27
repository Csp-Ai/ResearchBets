import type { ParsedSlip } from '@/src/core/postmortem/types';

export function detectSlip(text: string): boolean {
  return /kalshi|yes|no|market price/i.test(text);
}

export function parseSlip(text: string): ParsedSlip | null {
  if (!detectSlip(text)) return null;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const legs = lines
    .filter((line) => /yes|no|\$|¢|cents/i.test(line))
    .slice(0, 8)
    .map((line) => {
      const [market = 'Kalshi market'] = line.split(/\s+-\s+/);
      return {
        player: market,
        market: line.includes('NO') ? 'NO contract' : 'YES contract',
        odds: line.match(/\d{1,2}¢|\$\d+(?:\.\d+)?/)?.[0]
      };
    });

  // TODO: parse contract side + fill line/price in normalized numerical form.
  return { book: 'Kalshi', legs, rawText: text };
}
