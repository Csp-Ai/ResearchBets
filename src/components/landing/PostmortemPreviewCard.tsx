'use client';

import Link from 'next/link';

import { appendQuery } from './navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import styles from './landing.module.css';

export function PostmortemPreviewCard() {
  const nervous = useNervousSystem();

  return (
    <section className={styles.postmortemSection}>
      <div className={styles.postmortemInner}>
        <div className={styles.postmortemCard}>
          <div className={styles.postmortemHeader}>
            <span className={styles.stitle}>After the result</span>
            <span className={styles.previewBadge}>Preview</span>
          </div>
          <h3>Postmortem loop for your next slip</h3>
          <p>
            Log outcome → see what broke → refine the next ticket. Review workflow is available in
            Control Room and designed for calibration, not hindsight hype.
          </p>
          <div className={styles.postmortemActions}>
            <Link href={appendQuery(nervous.toHref('/control'), { tab: 'review' })} className={styles.btnPrimary}>
              Review results
            </Link>
            <Link href={appendQuery(nervous.toHref('/control'), { tab: 'review', sample: 1 })} className={styles.btnSecondary}>
              Try a sample review
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
