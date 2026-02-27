import type { ParsedSlip } from '@/src/core/postmortem/types';

const CLEAN = /\s+/g;

export function detectSlip(text: string): boolean {
  return /prizepicks|flex play|power play|entry details|projection/i.test(text);
}

export function parseSlip(text: string): ParsedSlip | null {
  if (!detectSlip(text)) return null;
  const lines = text.split('\n').map((line) => line.replace(CLEAN, ' ').trim()).filter(Boolean);
  const legs = lines
    .filter((line) => /\bmore\b|\bless\b|pts|reb|ast|pra|combo/i.test(line))
    .slice(0, 12)
    .map((line) => {
      const parts = line.split(/\s+(more|less)\s+/i);
      return {
        player: parts[0] || 'Unknown player',
        market: parts.slice(1).join(' ').trim() || 'projection',
        line: line.match(/[0-9]+(?:\.[0-9]+)?/)?.[0]
      };
    });

  return { book: 'PrizePicks', legs, rawText: text };
}
