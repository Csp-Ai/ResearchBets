import styles from './landing.module.css';

export type LandingPhase = 'before' | 'during' | 'after';

const phaseLabels: Record<LandingPhase, string> = {
  before: 'BEFORE',
  during: 'DURING',
  after: 'AFTER'
};

export function LifecycleTabs({
  activePhase,
  onPhaseChange
}: {
  activePhase: LandingPhase;
  onPhaseChange: (phase: LandingPhase) => void;
}) {
  return (
    <section className={styles.lifecycleTabsSection} aria-label="Betting lifecycle phases">
      <div className={styles.lifecycleTabs} role="tablist" aria-label="Lifecycle phases">
        {(Object.keys(phaseLabels) as LandingPhase[]).map((phase) => (
          <button
            key={phase}
            type="button"
            role="tab"
            aria-selected={activePhase === phase}
            className={`${styles.lifecycleTab} ${activePhase === phase ? styles.lifecycleTabActive : ''}`}
            onClick={() => onPhaseChange(phase)}
          >
            {phaseLabels[phase]}
          </button>
        ))}
      </div>
    </section>
  );
}
