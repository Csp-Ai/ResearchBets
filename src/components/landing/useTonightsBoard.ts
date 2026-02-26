'use client';

import { useEffect, useMemo, useState } from 'react';

import { DEMO_GAMES, type BettorGame } from '@/src/core/bettor/demoData';
import { readLiveModeEnabled, LIVE_MODE_EVENT } from '@/src/core/ui/preferences';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

type BettorDataEnvelopeClient = {
  mode: 'live' | 'demo';
  games: BettorGame[];
  providerStatus: {
    stats: 'connected' | 'missing';
    odds: 'connected' | 'missing';
    injuries: 'connected' | 'missing';
  };
  provenance: {
    source: 'provider' | 'fallback';
    reason?: string;
  };
};

type TonightsBoardState = {
  payload: BettorDataEnvelopeClient | null;
  loading: boolean;
};

const demoFallback: BettorDataEnvelopeClient = {
  mode: 'demo',
  games: DEMO_GAMES,
  providerStatus: {
    stats: 'missing',
    odds: 'missing',
    injuries: 'missing'
  },
  provenance: {
    source: 'fallback',
    reason: 'demo_mode'
  }
};

const ensurePopulatedGames = (payload: BettorDataEnvelopeClient): BettorDataEnvelopeClient => {
  const hasProps = payload.games.some((game) => game.propSuggestions.length > 0);
  if (hasProps) return payload;
  return {
    ...demoFallback,
    provenance: {
      source: 'fallback',
      reason: payload.provenance.reason ?? 'empty_board_fallback'
    }
  };
};

export function useTonightsBoard() {
  const [state, setState] = useState<TonightsBoardState>({ payload: demoFallback, loading: true });
  const { sport, tz, date, mode } = useNervousSystem();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const query = new URLSearchParams({ sport, tz, date });
        if (mode === 'demo') query.set('demo', '1');

        const response = await fetch(`/api/bettor-data?${query.toString()}`, {
          headers: {
            'x-live-mode': mode === 'demo' ? 'false' : readLiveModeEnabled() ? 'true' : 'false'
          }
        });
        const body = response.ok ? ensurePopulatedGames((await response.json()) as BettorDataEnvelopeClient) : demoFallback;
        if (active) {
          setState({ payload: body, loading: false });
        }
      } catch {
        if (active) {
          setState({ payload: demoFallback, loading: false });
        }
      }
    };

    void load();

    const onLiveModeChange = () => {
      setState((current) => ({ ...current, loading: true }));
      void load();
    };

    window.addEventListener(LIVE_MODE_EVENT, onLiveModeChange);
    return () => {
      active = false;
      window.removeEventListener(LIVE_MODE_EVENT, onLiveModeChange);
    };
  }, [date, mode, sport, tz]);

  const previewGames = useMemo(() => state.payload?.games.slice(0, 2) ?? [], [state.payload]);

  return {
    loading: state.loading,
    mode: state.payload?.mode ?? 'demo',
    reason: state.payload?.provenance.reason,
    games: previewGames
  };
}
