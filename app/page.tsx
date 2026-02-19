import { Credibility } from '@/features/landing/Credibility';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { LandingHero } from '@/features/landing/LandingHero';
import { StaticVerdictDemo } from '@/features/landing/StaticVerdictDemo';
import { TipUs } from '@/features/landing/TipUs';

export default function HomePage() {
  return (
    <main className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.08),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(45,212,191,0.06),transparent_40%)]" />
      <LandingHero />
      <HowItWorks />
      <StaticVerdictDemo />
      <Credibility />
      <TipUs />
    </main>
  );
}
