import Link from 'next/link';

import styles from './landing.module.css';

export function PostmortemPreviewCard() {
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
            <Link href="/control?tab=review" className={styles.btnPrimary}>
              Review results
            </Link>
            <span className={styles.postmortemHint}>In progress · available in Control Room</span>
          </div>
        </div>
      </div>
    </section>
  );
}
