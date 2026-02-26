'use client';

import Link from 'next/link';

import type { BettorGame, PropSuggestion } from '@/src/core/bettor/demoData';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import { appendQuery } from './navigation';
import styles from './landing.module.css';

type ScoutCardCompactProps = {
  game: BettorGame;
  prop: PropSuggestion;
};

export function ScoutCardCompact({ game, prop }: ScoutCardCompactProps) {
  const nervous = useNervousSystem();
  const hitL5 = Math.round(prop.hitRateL5 * 5);
  const scoutHref = appendQuery(nervous.toHref('/stress-test'), {
    tab: 'scout',
    scoutGame: game.id,
    scoutProp: prop.id,
    scoutLeg: `${prop.player} ${prop.market} ${prop.line}${prop.odds ? ` (${prop.odds})` : ''}`
  });
  const slipHref = appendQuery(nervous.toHref('/slip', { gameId: game.id, propId: prop.id }), {
    seedPlayer: prop.player,
    seedMarket: prop.market,
    seedLine: prop.line,
    seedOdds: prop.odds
  });

  return (
    <article className={styles.boardArtifactCard}>
      <div className={styles.boardArtifactHeader}>
        <p className={styles.boardMatchup}>{game.matchup}</p>
        <span className={styles.boardBadge}>{game.status === 'live' ? 'Live now' : game.startTime}</span>
      </div>

      <h3 className={styles.boardPropHeadline}>{prop.player} — {prop.market} {prop.line}</h3>
      <p className={styles.boardMonoSubline}>Line {prop.line} · {prop.odds ?? 'Market pending'} · Book consensus</p>

      <div className={styles.boardSignalRow}>
        <span className={styles.boardHitPill}>Hit {hitL5}/5 recently</span>
        <span className={styles.boardRecency}>L10: {Math.round(prop.hitRateL10 * 10)}/10 sample</span>
      </div>

      <ul className={styles.boardReasonList}>
        {prop.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}
      </ul>

      <p className={styles.boardUncertaintyBand}><strong>Uncertainty:</strong> {prop.uncertainty}</p>
      <p className={styles.boardSources}>Sources: {prop.contributingAgents.join(', ') || 'Deterministic demo signals'}</p>

      <div className={styles.boardActionRow}>
        <Link href={slipHref} className={styles.btnPrimary}>Build slip from this</Link>
        <Link href={scoutHref} className={styles.btnSecondary}>Open Scout</Link>
      </div>
    </article>
  );
}
