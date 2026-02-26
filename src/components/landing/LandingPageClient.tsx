'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BottomCTA } from './BottomCTA';
import { FAQ } from './FAQ';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { HowItWorksInline } from './HowItWorksInline';
import { NotSection } from './NotSection';
import { OddsMovement } from './OddsMovement';
import { Pillars } from './Pillars';
import { ProofStrip } from './ProofStrip';
import { RiskGauge } from './RiskGauge';
import { Tracker } from './Tracker';
import { VerdictMock } from './VerdictMock';
import { getModeFromSearchParams } from './mode';
import { useLandingTelemetry } from './useLandingTelemetry';
import styles from './landing.module.css';

export function LandingPageClient() {
  const searchParams = useSearchParams();
  const mode = getModeFromSearchParams(searchParams);
  const { summary, today, loading, freshnessMinutes } = useLandingTelemetry(mode);
  const [runToken, setRunToken] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.getElementById('tracker');
    if (!section) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        setRunToken((v) => v + 1);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setStickyVisible(!(entry?.isIntersecting ?? true));
    }, { threshold: 0.1 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const onRunFromSnapshot = () => {
    document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => setRunToken((v) => v + 1), 300);
  };

  const effectiveMode = today?.mode ?? summary.mode;
  const modeReason = today?.reason ?? summary.reason;
  const stats = {
    slips: Math.max(0, Math.floor((summary.last_24h.slips || 0) / 10)),
    riskRate: summary.risk?.count ? Math.min(99, summary.risk.count) : 0,
    accuracy: summary.perf.p50_ms ? Math.max(1, Math.min(99, Math.round(100 - summary.perf.p50_ms / 40))) : 0,
    correlationWarnings: summary.risk?.count ? Math.max(0, Math.floor(summary.risk.count / 2)) : 0
  };

  return (
    <div className={styles.landingRoot}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Research<span>Bets</span></div>
        <ul>
          <li><Link href="/ingest">Analyze</Link></li>
          <li><Link href="/stress-test">Research</Link></li>
          <li><Link href="/slip">Build Slip</Link></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <Link href="/ingest" className={styles.btnNav}>Analyze my slip</Link>
      </nav>
      <Hero
        mode={mode}
        modeReason={modeReason}
        today={today ?? null}
        loading={loading}
        onRunFromSnapshot={onRunFromSnapshot}
        stats={stats}
        freshnessMinutes={freshnessMinutes}
      />
      <section className={styles.proofStack}>
        <ProofStrip />
        <HowItWorksInline />
        <RiskGauge />
        <OddsMovement mode={effectiveMode} reason={modeReason} updatedLabel={`Updated ${freshnessMinutes}m ago`} />
        <Tracker mode={effectiveMode} autoRunToken={runToken} reason={modeReason} updatedLabel={`Updated ${freshnessMinutes}m ago`} />
      </section>
      <Pillars />
      <VerdictMock />
      <NotSection />
      <FAQ />
      <BottomCTA stickyVisible={stickyVisible} mode={effectiveMode} reason={modeReason} />
      <Footer />
    </div>
  );
}
