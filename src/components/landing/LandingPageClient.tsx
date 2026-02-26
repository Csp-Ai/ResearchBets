'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BottomCTA } from './BottomCTA';
import { FAQ } from './FAQ';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { LiveSnapshot } from './LiveSnapshot';
import { NotSection } from './NotSection';
import { OddsMovement } from './OddsMovement';
import { Pillars } from './Pillars';
import { ProofStrip } from './ProofStrip';
import { RiskGauge } from './RiskGauge';
import { StatsBar } from './StatsBar';
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

  const onRunFromSnapshot = () => {
    document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => setRunToken((v) => v + 1), 300);
  };

  const effectiveMode = today?.mode ?? summary.mode;
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
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#tracker">Stress test</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <Link href="/ingest" className={styles.btnNav}>Stress test a slip →</Link>
      </nav>
      <Hero />
      <ProofStrip />
      <StatsBar stats={stats} mode={effectiveMode} freshnessMinutes={freshnessMinutes} />
      <LiveSnapshot mode={mode} onRun={onRunFromSnapshot} snapshot={today ?? null} loading={loading} />
      <RiskGauge />
      <OddsMovement mode={effectiveMode} updatedLabel={`Updated ${freshnessMinutes}m ago`} />
      <Tracker mode={effectiveMode} autoRunToken={runToken} updatedLabel={`Updated ${freshnessMinutes}m ago`} />
      <Pillars />
      <VerdictMock />
      <NotSection />
      <FAQ />
      <BottomCTA />
      <Footer />
    </div>
  );
}
