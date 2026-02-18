import { CANONICAL_GAMES } from '@/src/core/games/registry';
import { complianceText } from '@/src/core/policy/text';

import { validateCopyText } from './copyPolicy';

export type CopySource = {
  id: string;
  surface: 'live' | 'research' | 'decision-card' | 'constants';
  file: string;
  strings: readonly string[];
};

const warnedSources = new Set<string>();

const constantSources: CopySource[] = [
  {
    id: 'constants.policy.complianceText',
    surface: 'constants',
    file: 'src/core/policy/text.ts',
    strings: Object.values(complianceText)
  },
  {
    id: 'constants.games.registryLabels',
    surface: 'constants',
    file: 'src/core/games/registry.ts',
    strings: CANONICAL_GAMES.map((game) => `${game.league} ${game.label}`)
  }
];

export function validateCopyPolicyInDev(sources: CopySource[]): void {
  if (process.env.NODE_ENV !== 'development') return;

  [...constantSources, ...sources].forEach((source) => {
    if (warnedSources.has(source.id)) return;

    const violations = source.strings.flatMap((entry) => {
      const result = validateCopyText(entry);
      return result.violations.map((violation) => ({
        phrase: violation.phrase,
        copy: entry
      }));
    });

    if (violations.length > 0) {
      warnedSources.add(source.id);
      const preview = violations
        .slice(0, 5)
        .map((item) => `"${item.phrase}" in "${item.copy}"`)
        .join(', ');
      // eslint-disable-next-line no-console
      console.warn(
        `[copy-policy][${source.surface}] ${source.file} contains banned deterministic/tout copy: ${preview}`
      );
    }
  });
}
