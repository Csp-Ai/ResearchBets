'use client';

import { useEffect, useMemo, useState } from 'react';

import { DEMO_GAMES, type BettorGame } from '@/src/core/bettor/demoData';
import { readLiveModeEnabled, LIVE_MODE_EVENT } from '@/src/core/ui/preferences';

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

export function useTonightsBoard() {
  const [state, setState] = useState<TonightsBoardState>({ payload: null, loading: true });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/bettor-data', {
          headers: {
            'x-live-mode': readLiveModeEnabled() ? 'true' : 'false'
          }
        });
        const body = response.ok ? (await response.json()) as BettorDataEnvelopeClient : demoFallback;
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
  }, []);

  const previewGames = useMemo(() => state.payload?.games.slice(0, 2) ?? [], [state.payload]);

  return {
    loading: state.loading,
    mode: state.payload?.mode ?? 'demo',
    reason: state.payload?.provenance.reason,
    games: previewGames
  };
}
