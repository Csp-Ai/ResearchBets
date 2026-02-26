import styles from './landing.module.css';

const steps = [
  { icon: '1', title: 'Before', copy: 'Weakest-leg risk preview surfaces the most fragile leg before lock.' },
  { icon: '2', title: 'During', copy: 'Watch line movement + injury status without leaving the board flow.' },
  { icon: '3', title: 'After', copy: 'Postmortem notes explain what broke and how to tune the next slip.' }
];

export function LoopRow() {
  return (
    <section className={styles.howItWorksInline} aria-label="3-step betting loop">
      {steps.map((step) => (
        <article key={step.title} className={styles.howStep}>
          <span className={styles.howIcon} aria-hidden>{step.icon}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
