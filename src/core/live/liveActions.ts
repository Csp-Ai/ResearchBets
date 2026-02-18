import { createClientRequestId } from '../identifiers/session';
import { runUiAction, type ActionEnvelope } from '../ui/actionContract';

export async function runSeeLiveGamesAction(input: {
  sport: string;
  traceId?: string;
}): Promise<ActionEnvelope<{ sport: string; traceId: string }>> {
  return runUiAction({
    actionName: 'see_live_games',
    traceId: input.traceId,
    execute: async () => ({
      ok: true,
      data: { sport: input.sport, traceId: input.traceId ?? createClientRequestId() },
      source: 'live',
      degraded: false
    })
  });
}
