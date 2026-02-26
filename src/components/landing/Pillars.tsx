import styles from './landing.module.css';

export function Pillars() {
  return (
    <section className={styles.pillars}>
      <div className={styles.sectionLabel}>One system</div>
      <div className={styles.sectionHeading}>What you get before you bet.</div>
      <div className={styles.pillarsGrid}>
        <article className={styles.pillar}>
          <div className={styles.pillarNum}>01</div>
          <h3>Find the leg that collapses your parlay</h3>
          <p>Weakest-leg detection surfaces the one outcome driving most downside.</p>
        </article>
        <article className={styles.pillar}>
          <div className={styles.pillarNum}>02</div>
          <h3>See why the model distrusts a line</h3>
          <p>Correlation and fragility cues explain where confidence breaks.</p>
        </article>
        <article className={styles.pillar}>
          <div className={styles.pillarNum}>03</div>
          <h3>Spot volatility before you lock it</h3>
          <p>Line movement and event telemetry flag unstable conditions early.</p>
        </article>
      </div>
    </section>
  );
}
