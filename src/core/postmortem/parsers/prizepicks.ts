import type { ParsedSlip } from '@/src/core/postmortem/types';

export function detectSlip(text: string): boolean {
  return /prizepicks|flex play|power play|picks/i.test(text);
}

export function parseSlip(text: string): ParsedSlip | null {
  if (!detectSlip(text)) return null;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const legs = lines
    .filter((line) => /more|less|pts|reb|ast/i.test(line))
    .slice(0, 8)
    .map((line) => {
      const parts = line.split(/\s+(more|less)\s+/i);
      return {
        player: parts[0] || 'Unknown player',
        market: parts.slice(1).join(' ').trim() || 'projection',
        line: line.match(/\d+(\.\d+)?/)?.[0]
      };
    });

  // TODO: map entries to market enums used by run/postmortem workflows.
  return { book: 'PrizePicks', legs, rawText: text };
}
