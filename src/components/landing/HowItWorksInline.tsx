import styles from './landing.module.css';

const steps = [
  { icon: '⇪', title: 'Paste slip or upload screenshot', description: 'Drop a ticket or image and parse all legs in seconds.' },
  { icon: '⚙', title: 'Get weakest-leg + risk verdict', description: 'See concentration, volatility, and confidence before placing.' },
  { icon: '✓', title: 'Decide: Keep / Modify / Pass', description: 'Use the verdict to trim risk or skip low-edge parlays.' }
];

export function HowItWorksInline() {
  return (
    <section className={styles.howItWorksInline} id="how-it-works">
      {steps.map((step) => (
        <article key={step.title} className={styles.howStep}>
          <span className={styles.howIcon}>{step.icon}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
