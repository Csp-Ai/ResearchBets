import Link from 'next/link';
import styles from './landing.module.css';

export function BottomCTA() {
  return <section className={styles.bottomCta}><div className={styles.bottomGlow} /><h2>Run your slip<br />through<br /><em>ResearchBets.</em></h2><p>Takes 30 seconds. Could save you a leg.</p><div className={styles.bottomCtas}><Link href="/ingest" className={styles.btnPrimary}>Stress test a slip →</Link><Link href="/stress-test?demo=1" className={styles.btnSecondary}>Browse prop ideas</Link></div></section>;
}
