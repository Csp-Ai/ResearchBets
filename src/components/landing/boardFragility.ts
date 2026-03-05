import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';

export type BoardFragilityPick = {
  rowId: string;
  player: string;
  market: string;
  line?: string;
  odds?: string;
  fragility: number;
  reasons: string[];
  evidence: string;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const hasValue = (value?: string) => Boolean(value && value !== '—');

const buildEvidence = (row: CockpitBoardLeg): string => {
  const source = row.attemptsSource?.trim();
  return source ? `Evidence: ${source}` : 'Evidence: board signals';
};

const stableKey = (row: CockpitBoardLeg): string => {
  if (row.id) return row.id;
  return `${row.player}|${row.market}|${row.line}`;
};

export function pickMostFragileProp(rows: readonly CockpitBoardLeg[]): BoardFragilityPick | null {
  if (rows.length === 0) return null;

  let best: BoardFragilityPick | null = null;
  let bestKey = '';

  for (const row of rows) {
    let score = 0;
    let hasAttemptDrop = false;
    const reasons: string[] = [];

    if (typeof row.threesAttL1 === 'number' && typeof row.threesAttL3Avg === 'number' && row.threesAttL3Avg > 0) {
      const drop3 = clamp01((row.threesAttL3Avg - row.threesAttL1) / row.threesAttL3Avg);
      if (drop3 > 0) {
        score += 0.45 * drop3;
        hasAttemptDrop = true;
        reasons.push('3PA down vs L3');
      }
    }

    if (typeof row.fgaL1 === 'number' && typeof row.fgaL3Avg === 'number' && row.fgaL3Avg > 0) {
      const dropFga = clamp01((row.fgaL3Avg - row.fgaL1) / row.fgaL3Avg);
      if (dropFga > 0) {
        score += 0.35 * dropFga;
        hasAttemptDrop = true;
        reasons.push('FGA down vs L3');
      }
    }

    if (row.riskTag === 'watch') {
      score += 0.2;
      reasons.push('Variance watch');
    }

    if (hasAttemptDrop && (row.market === '3PM' || row.market === 'PTS')) {
      score += 0.1;
      reasons.push('Volume-dependent market');
    } else if (row.riskTag === 'watch' && (row.market === 'AST' || row.market === 'REB')) {
      score += 0.05;
      reasons.push('Higher-variance market');
    }

    const fragility = clamp01(score);
    const pick: BoardFragilityPick = {
      rowId: row.id,
      player: row.player,
      market: row.market,
      line: hasValue(row.line) ? row.line : undefined,
      odds: hasValue(row.odds) ? row.odds : undefined,
      fragility,
      reasons: reasons.slice(0, 3),
      evidence: buildEvidence(row)
    };

    const key = stableKey(row);
    if (!best || pick.fragility > best.fragility || (pick.fragility === best.fragility && key.localeCompare(bestKey) < 0)) {
      best = pick;
      bestKey = key;
    }
  }

  return best;
}
