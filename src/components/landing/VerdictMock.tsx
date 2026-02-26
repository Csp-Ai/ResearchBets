import Link from 'next/link';
import styles from './landing.module.css';

export function VerdictMock() {
  return <section className={styles.verdictSection}><div className={styles.verdictInner}><div className={styles.verdictCopy}><div className={styles.sectionLabel}>Phase 02. Verdict output.</div><h2>What&apos;s the<br />trap in<br />your slip?</h2><p>Paste your legs or build a slip. We&apos;ll tell you what looks off before you lose on the leg you should&apos;ve cut.</p><Link className={styles.btnPrimary} href="/ingest">Stress test now →</Link></div><div className={styles.verdictCard}><div className={styles.verdictCardHeader}><span className={styles.vtitle}>Slip analysis. 4-leg parlay.</span><span className={styles.riskBadge}>Moderate risk</span></div><div className={styles.legList}><div className={styles.legRow}>Jalen Brunson — 27+ PTS <span>-115</span></div><div className={styles.legRow}>Knicks ML <span>-130</span></div><div className={styles.legRow}>Tyrese Haliburton — 8+ AST <span>+105</span></div><div className={styles.legRow}>PJ Tucker — 3+ REB <span>-140</span></div></div></div></div></section>;
}
