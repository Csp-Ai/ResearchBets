'use client';

import Link from 'next/link';

import { motion, useReducedMotion } from 'framer-motion';

import { ScoutCardCompact } from './ScoutCardCompact';
import styles from './landing.module.css';
import { useTonightsBoard } from './useTonightsBoard';
import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

export function TonightsBoardPreview() {
  const { games, loading, mode } = useTonightsBoard();
  const nervous = useNervousSystem();
  const cards = games.flatMap((game) => game.propSuggestions.slice(0, 2).map((prop) => ({ game, prop }))).slice(0, 4);
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="tonights-board"
      className={styles.boardSection}
      initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reduceMotion ? undefined : { duration: 0.4, ease: 'easeOut' }}
    >
      <div className={styles.boardInner}>
        <div className={styles.boardHeader}>
          <div>
            <div className={styles.sectionLabelRow}>
              <div className={styles.sectionLabelPulse} aria-hidden />
              <div className={styles.sectionLabel}>Tonight&apos;s Board · {mode === 'live' ? 'Live slate' : 'Demo dataset'}</div>
            </div>
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

        <div className={styles.boardCardsGrid}>
          {cards.map(({ game, prop }) => <ScoutCardCompact key={prop.id} game={game} prop={prop} />)}
        </div>
        {loading ? <p className={styles.boardLoadingNote}>Refreshing live board… showing deterministic fallback cards.</p> : null}
      </div>
    </motion.section>
  );
}
