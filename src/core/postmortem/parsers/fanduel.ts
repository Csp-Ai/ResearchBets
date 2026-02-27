import type { ParsedSlip } from '@/src/core/postmortem/types';

export function detectSlip(text: string): boolean {
  return /fanduel|sgp|same game parlay/i.test(text);
}

export function parseSlip(text: string): ParsedSlip | null {
  if (!detectSlip(text)) return null;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const legs = lines
    .filter((line) => /over|under|\+\d|\-\d/i.test(line))
    .slice(0, 8)
    .map((line) => {
      const [player = 'Unknown player', ...rest] = line.split(/\s+-\s+|\s+\|\s+/);
      return { player, market: rest.join(' ').slice(0, 80) || 'market', odds: line.match(/[+-]\d{3}/)?.[0] };
    });

  // TODO: tighten parsing against real FanDuel exports/screenshots.
  return { book: 'FanDuel', legs, rawText: text };
}
