'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BottomCTA } from './BottomCTA';
import { FAQ } from './FAQ';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { LiveSnapshot } from './LiveSnapshot';
import { LoopRow } from './LoopRow';
import { getModeReasonText, getTelemetryUpdatedLabel } from './LiveSnapshot';
import { NotSection } from './NotSection';
import { OddsMovement } from './OddsMovement';
import { PostmortemPreviewCard } from './PostmortemPreviewCard';
import { RiskGauge } from './RiskGauge';
import { TonightsBoardPreview } from './TonightsBoardPreview';
import { Tracker } from './Tracker';
import { appendQuery } from './navigation';
import { getModeFromSearchParams } from './mode';
import { useLandingTelemetry } from './useLandingTelemetry';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { NervousSystemStrip, mapProviderHealthToNervousSteps } from '@/src/components/nervous/NervousSystemStrip';
import styles from './landing.module.css';

export function LandingPageClient() {
  const nervous = useNervousSystem();
  const searchParams = useSearchParams();
  const mode = getModeFromSearchParams(searchParams);
  const { summary, today, loading, freshnessMinutes, providerHealth } = useLandingTelemetry({
    mode,
    sport: nervous.sport,
    tz: nervous.tz,
    date: nervous.date
  });
  const [runToken, setRunToken] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);

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
  }, []);

  useEffect(() => {
    const board = document.getElementById('tonights-board');
    if (!board) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setStickyVisible(
          !(entry?.isIntersecting ?? true) && (entry?.boundingClientRect.top ?? 0) < 0
        );
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
  const heroMode = effectiveMode === 'demo' ? 'demo' : 'live';
  const modeReason = today?.reason ?? summary.reason;
  const reasonLabel = getModeReasonText(modeReason);
  const updatedLabel = getTelemetryUpdatedLabel(effectiveMode, freshnessMinutes);

  return (
    <div className={styles.landingRoot}>
      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          Research<span>Bets</span>
        </div>

        {/* Desktop links */}
        <ul>
          <li>
            <Link href={nervous.toHref('/stress-test')}>Research</Link>
          </li>
          <li>
            <Link href={nervous.toHref('/slip')}>Build Slip</Link>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>

        {/* Single primary nav CTA */}
        <Link href={nervous.toHref('/ingest')} className={styles.btnNav}>
          Analyze slip
        </Link>
      </nav>

      <section className={styles.heroBoardSplit}>
        <Hero
          mode={mode}
          modeReason={reasonLabel}
          today={today ?? null}
          loading={loading}
          freshnessMinutes={freshnessMinutes}
          providerHealth={providerHealth}
        />

        <TonightsBoardPreview />
      </section>

      <LoopRow />

      <NervousSystemStrip
        mode={effectiveMode}
        steps={mapProviderHealthToNervousSteps(providerHealth)}
        collapsedByDefault
      />

      <section className={styles.proofStack}>
        <div className={styles.phaseStack}>
          <section className={styles.boardDisclosureSection}>
            <details className={styles.boardDisclosure}>
              <summary>See slip risk &amp; research steps</summary>
              <RiskGauge />
              <Tracker
                mode={heroMode}
                autoRunToken={runToken}
                reason={reasonLabel}
                updatedLabel={updatedLabel}
              />
            </details>
          </section>

          <LiveSnapshot
            mode={mode}
            snapshot={today ?? null}
            loading={loading}
            onRun={onRunFromSnapshot}
            providerHealth={providerHealth}
          />
          <OddsMovement
            mode={heroMode}
            reason={reasonLabel}
            updatedLabel={updatedLabel}
          />
          <section className={styles.phaseLinkSection}>
            <div className={styles.telemetryStripSmall}>
              <span className={styles.telemetryDot} />
              <span>
                {effectiveMode === 'live' ? 'Live telemetry active' : 'Demo telemetry active'}
              </span>
              <span className={styles.reasonHelp} title={`${reasonLabel} • Open Control Room live view for feed diagnostics.`}>ⓘ</span>
              <Link
                href={appendQuery(nervous.toHref('/control'), { tab: 'live' })}
                className={styles.telemetryLink}
              >
                Live view
              </Link>
            </div>
          </section>

          <PostmortemPreviewCard />
        </div>
      </section>

      <NotSection />
      <FAQ />
      <BottomCTA
        stickyVisible={stickyVisible}
        mode={heroMode}
        reason={reasonLabel}
      />
      <Footer />
    </div>
  );
}
