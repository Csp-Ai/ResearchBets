import type { ParsedSlip } from '@/src/core/postmortem/types';

const CLEAN = /\s+/g;

export function detectSlip(text: string): boolean {
  return /fanduel|same game parlay|sgp|single game parlay|betslip/i.test(text);
}

export function parseSlip(text: string): ParsedSlip | null {
  if (!detectSlip(text)) return null;
  const lines = text.split('\n').map((line) => line.replace(CLEAN, ' ').trim()).filter(Boolean);
  const legs = lines
    .filter((line) => /\bover\b|\bunder\b|\+[0-9]{3}|-[0-9]{3}/i.test(line))
    .slice(0, 12)
    .map((line) => {
      const odds = line.match(/([+-][0-9]{3})/)?.[1];
      const lineValue = line.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1];
      const [player = 'Unknown player', ...rest] = line.split(/\s+-\s+|\s+\|\s+/);
      return {
        player,
        market: rest.join(' ').slice(0, 120) || 'market',
        line: lineValue,
        odds
      };
    });

  return { book: 'FanDuel', legs, rawText: text };
}
