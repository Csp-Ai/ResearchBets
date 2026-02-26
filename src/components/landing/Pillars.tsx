import styles from './landing.module.css';

export function Pillars() {
  return <section className={styles.pillars} id="how-it-works"><div className={styles.sectionLabel}>Three phases</div><div className={styles.sectionHeading}>One system.</div><div className={styles.pillarsGrid}><article className={styles.pillar}><div className={styles.pillarNum}>Phase 01</div><h3>Build It</h3><p>AI-researched prop ideas from matchup data, injury reports, and trends.</p></article><article className={styles.pillar}><div className={styles.pillarNum}>Phase 02</div><h3>Check It</h3><p>Stress test your slip before you submit and flag overlap and weakest legs.</p></article><article className={styles.pillar}><div className={styles.pillarNum}>Phase 03</div><h3>Learn It</h3><p>Run postmortem analysis and spot what repeatedly costs you EV.</p></article></div></section>;
}
