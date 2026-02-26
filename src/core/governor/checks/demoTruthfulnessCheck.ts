import { CANONICAL_DEMO_LABEL } from '@/src/core/governor/rules';
import type { GovernorCheck } from '@/src/core/governor/types';

export const demoTruthfulnessCheck = (content: string): GovernorCheck => {
  const hasBadCopy = content.toLowerCase().includes('env failed');
  const hasCanonical = content.includes(CANONICAL_DEMO_LABEL);
  const pass = !hasBadCopy && hasCanonical;
  return {
    id: 'DemoTruthfulnessCheck',
    level: pass ? 'info' : 'warn',
    pass,
    message: pass
      ? `Demo/live truthfulness copy is aligned (${CANONICAL_DEMO_LABEL}).`
      : 'Demo/live truthfulness copy drift detected.',
  };
};
