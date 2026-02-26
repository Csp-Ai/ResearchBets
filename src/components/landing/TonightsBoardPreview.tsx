'use client';

import Link from 'next/link';

import { ScoutCardCompact } from './ScoutCardCompact';
import styles from './landing.module.css';
import { useTonightsBoard } from './useTonightsBoard';
import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

export function TonightsBoardPreview() {
  const { games, loading, mode } = useTonightsBoard();
  const nervous = useNervousSystem();
  const cards = games.flatMap((game) => game.propSuggestions.slice(0, 2).map((prop) => ({ game, prop }))).slice(0, 4);

  return (
    <section id="tonights-board" className={styles.boardSection}>
      <div className={styles.boardInner}>
        <div className={styles.boardHeader}>
          <div>
            <div className={styles.sectionLabel}>Tonight&apos;s Board · {mode === 'live' ? 'Live slate' : 'Demo dataset'}</div>
            <h2>2 quick spots to scout before you lock.</h2>
            <p className={styles.sectionCaption}>Actionable props with reasons, uncertainty, and direct handoff into Stress Test.</p>
          </div>
          <Link
            href={appendQuery(nervous.toHref('/stress-test'), { tab: 'scout' })}
            className={styles.btnSecondary}
          >
            Open full Scout
          </Link>
        </div>

        {loading ? (
          <div className={styles.boardSkeletonGrid}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className={styles.boardSkeletonCard}>
                <span className={styles.skeleton} style={{ width: '45%', height: 12 }} />
                <span className={styles.skeleton} style={{ width: '92%', height: 18 }} />
                <span className={styles.skeleton} style={{ width: '100%', height: 104 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.boardCardsGrid}>
            {cards.map(({ game, prop }) => <ScoutCardCompact key={prop.id} game={game} prop={prop} />)}
          </div>
        )}
      </div>
    </section>
  );
}
