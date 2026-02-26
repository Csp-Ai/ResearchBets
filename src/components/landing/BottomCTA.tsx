import Link from 'next/link';
import styles from './landing.module.css';

export function BottomCTA({
  stickyVisible,
  mode,
  reason
}: {
  stickyVisible: boolean;
  mode: 'live' | 'demo';
  reason?: string;
}) {
  return (
    <>
      <div className={`${styles.stickyBar} ${stickyVisible ? styles.stickyVisible : ''}`}>
        <div className={styles.stickyMode}>
          {mode === 'live' ? 'Live telemetry' : 'Demo telemetry'}
          {reason ? <span className={styles.stickyReason}>· {reason}</span> : null}
        </div>
        <div className={styles.stickyActions}>
          <Link href="/ingest" className={styles.btnPrimary}>Analyze slip</Link>
          <Link href="/stress-test?demo=1" className={styles.btnSecondary}>Demo</Link>
        </div>
      </div>
      <section className={styles.bottomCta}>
        <div className={styles.bottomGlow} />
        <h2>Ready to check your ticket?</h2>
        <p>Run it in under 30 seconds and decide with context.</p>
        <div className={styles.bottomCtas}>
          <Link href="/ingest" className={styles.btnPrimary}>Analyze my slip</Link>
          <Link href="/stress-test?demo=1" className={styles.btnSecondary}>Run demo</Link>
        </div>
      </section>
    </>
  );
}
