'use client';

import Link from 'next/link';

import { useTonightsBoard } from './useTonightsBoard';
import styles from './landing.module.css';

const toPrefillLeg = (player: string, market: string, line: number, odds?: string) => `${player} ${market} ${line}${odds ? ` (${odds})` : ''}`;

export function TonightsBoardPreview() {
  const { games, loading, mode } = useTonightsBoard();

  return (
    <section id="tonights-board" className={styles.boardSection}>
      <div className={styles.boardInner}>
        <div className={styles.boardHeader}>
          <div>
            <div className={styles.sectionLabel}>Tonight&apos;s Board · {mode === 'live' ? 'Live slate' : 'Demo slate'}</div>
            <h2>2 quick spots to scout before you lock.</h2>
            <p className={styles.sectionCaption}>Actionable props with context, uncertainty, and one-click handoff into Stress Test.</p>
          </div>
          <Link href="/stress-test?tab=scout" className={styles.btnSecondary}>Open full Scout</Link>
        </div>

        {loading ? (
          <div className={styles.boardSkeletonGrid}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className={styles.boardSkeletonCard}>
                <span className={styles.skeleton} style={{ width: '48%', height: 14 }} />
                <span className={styles.skeleton} style={{ width: '85%', height: 12 }} />
                <span className={styles.skeleton} style={{ width: '90%', height: 80 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.boardGrid}>
            {games.map((game) => (
              <article key={game.id} className={styles.boardGameCard}>
                <div className={styles.boardGameHeader}>
                  <h3>{game.matchup}</h3>
                  <span className={styles.boardGameTime}>{game.status === 'live' ? 'Live now' : game.startTime}</span>
                </div>
                <div className={styles.boardPropGrid}>
                  {game.propSuggestions.slice(0, 2).map((prop) => {
                    const prefill = toPrefillLeg(prop.player, prop.market, prop.line, prop.odds);
                    return (
                      <div key={prop.id} className={styles.boardPropCard}>
                        <p className={styles.boardPropTitle}>{prop.player} · {prop.market} {prop.line} {prop.odds ? `(${prop.odds})` : ''}</p>
                        <p className={styles.boardPropHit}>Hit {Math.round(prop.hitRateL5 * 5)}/5 recently ({Math.round(prop.hitRateL10 * 10)}/10 sample)</p>
                        <ul>
                          {prop.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
                        </ul>
                        <p className={styles.boardMeta}><strong>Uncertainty:</strong> {prop.uncertainty}</p>
                        <p className={styles.boardMeta}><strong>Sources:</strong> {prop.contributingAgents.join(', ') || 'Deterministic demo signals'}</p>
                        <Link href={`/stress-test?tab=analyze&prefill=${encodeURIComponent(prefill)}`} className={styles.boardAnalyzeLink}>Analyze this</Link>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className={styles.boardFooterCta}>
          <Link href="/stress-test?tab=scout" className={styles.btnPrimary}>Analyze these picks</Link>
        </div>
      </div>
    </section>
  );
}
