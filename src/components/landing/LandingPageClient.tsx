'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BottomCTA } from './BottomCTA';
import { FAQ } from './FAQ';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { LifecycleTabs, type LandingPhase } from './LifecycleTabs';
import { LiveSnapshot } from './LiveSnapshot';
import { getModeReasonText, getTelemetryUpdatedLabel } from './LiveSnapshot';
import { NotSection } from './NotSection';
import { OddsMovement } from './OddsMovement';
import { PostmortemPreviewCard } from './PostmortemPreviewCard';
import { RiskGauge } from './RiskGauge';
import { TonightsBoardPreview } from './TonightsBoardPreview';
import { Tracker } from './Tracker';
import { getModeFromSearchParams } from './mode';
import { useLandingTelemetry } from './useLandingTelemetry';
import styles from './landing.module.css';

export function LandingPageClient() {
  const searchParams = useSearchParams();
  const mode = getModeFromSearchParams(searchParams);
  const { summary, today, loading, freshnessMinutes } = useLandingTelemetry(mode);
  const [runToken, setRunToken] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [activePhase, setActivePhase] = useState<LandingPhase>('before');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.getElementById('tracker');
    if (!section) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setRunToken((v) => v + 1);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(section);
    return () => obs.disconnect();
  }, [activePhase]);

  useEffect(() => {
    const board = document.getElementById('tonights-board');
    if (!board) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setStickyVisible(!(entry?.isIntersecting ?? true) && (entry?.boundingClientRect.top ?? 0) < 0);
      },
      { threshold: 0.15 }
    );
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const onRunFromSnapshot = () => {
    document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => setRunToken((v) => v + 1), 300);
  };

  const effectiveMode = today?.mode ?? summary.mode;
  const modeReason = today?.reason ?? summary.reason;
  const reasonLabel = getModeReasonText(modeReason);
  const updatedLabel = getTelemetryUpdatedLabel(effectiveMode, freshnessMinutes);

  return (
    <div className={styles.landingRoot}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          Research<span>Bets</span>
        </div>
        <ul>
          <li>
            <Link href="/ingest" className={styles.btnSecondary}>Analyze</Link>
          </li>
          <li>
            <Link href="/stress-test">Research</Link>
          </li>
          <li>
            <Link href="/slip">Build Slip</Link>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
        <Link href="/ingest">Analyze</Link>
      </nav>
      <Hero
        mode={mode}
        modeReason={reasonLabel}
        today={today ?? null}
        loading={loading}
        onRunFromSnapshot={onRunFromSnapshot}
        freshnessMinutes={freshnessMinutes}
      />

      <section className={styles.proofStack}>
        <LifecycleTabs activePhase={activePhase} onPhaseChange={setActivePhase} />
        {activePhase === 'before' ? (
          <div className={styles.phaseStack}>
            <TonightsBoardPreview />
            <section className={styles.boardDisclosureSection}>
              <details className={styles.boardDisclosure}>
                <summary>See slip risk example</summary>
                <RiskGauge />
                <Tracker
                  mode={effectiveMode}
                  autoRunToken={runToken}
                  reason={reasonLabel}
                  updatedLabel={updatedLabel}
                />
              </details>
            </section>
          </div>
        ) : null}

        {activePhase === 'during' ? (
          <div className={styles.phaseStack}>
            <LiveSnapshot mode={mode} snapshot={today ?? null} loading={loading} onRun={onRunFromSnapshot} />
            <OddsMovement
              mode={effectiveMode}
              reason={reasonLabel}
              updatedLabel={updatedLabel}
            />
            <section className={styles.phaseLinkSection}>
              <div className={styles.phaseLinkCard}>
                <div className={styles.sectionLabel}>
                  {effectiveMode === 'live' ? 'Live telemetry' : 'Demo telemetry'}
                </div>
                <h3>Need the live board?</h3>
                <p>Open Control Room live view to monitor game state and market movement.</p>
                <Link href="/control?tab=live" className={styles.btnSecondary}>
                  Open live view
                </Link>
              </div>
            </section>
          </div>
        ) : null}

        {activePhase === 'after' ? (
          <div className={styles.phaseStack}>
            <PostmortemPreviewCard />
            <Tracker
              mode={effectiveMode}
              autoRunToken={runToken}
              reason={reasonLabel}
              updatedLabel={updatedLabel}
            />
          </div>
        ) : null}
      </section>

      <NotSection />
      <FAQ />
      <BottomCTA stickyVisible={stickyVisible} mode={effectiveMode} reason={reasonLabel} activePhase={activePhase} />
      <Footer />
    </div>
  );
}
