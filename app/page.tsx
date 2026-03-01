import { BettorCockpitLanding } from '@/src/components/landing/BettorCockpitLanding';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

export default function HomePage() {
  return (
    <NervousSystemProvider>
      <BettorCockpitLanding />
    </NervousSystemProvider>
  );
}
