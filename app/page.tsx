import { Credibility } from '@/features/landing/Credibility';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { LandingHero } from '@/features/landing/LandingHero';
import { StaticVerdictDemo } from '@/features/landing/StaticVerdictDemo';
import { TipUs } from '@/features/landing/TipUs';

export default function HomePage() {
  return (
    <main className="space-y-6">
      <LandingHero />
      <HowItWorks />
      <StaticVerdictDemo />
      <Credibility />
      <TipUs />
    </main>
  );
}
