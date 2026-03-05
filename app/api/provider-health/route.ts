import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getRuntimeContext } from '@/src/core/env/runtimeContext.server';
import { computeProviderHealth } from '@/src/core/health/providerHealth.server';

export const runtime = 'nodejs';

async function emitFallbackEvent(providerErrors: string[], startedAt: number) {
  try {
    await new DbEventEmitter().emit({
      event_name: 'live_poll_degraded',
      timestamp: new Date().toISOString(),
      request_id: 'provider-health',
      trace_id: 'provider-health',
      agent_id: 'provider-health',
      model_version: 'v1',
      properties: {
        providerErrors,
        latency_bucket: Date.now() - startedAt > 2000 ? 'slow' : 'fast'
      }
    });
  } catch {
    // Non-blocking diagnostics only.
  }
}

export async function GET() {
  const startedAt = Date.now();
  const runtimeContext = getRuntimeContext();
  const health = await computeProviderHealth({ sport: 'NBA' });

  if (!health.ok && health.providerErrors.length > 0) {
    await emitFallbackEvent(health.providerErrors, startedAt);
  }

  return NextResponse.json({
    ...health,
    ...(health.messages.length > 0 ? { messages: health.messages } : {}),
    runtime,
    runtimeContext,
    nodeEnv: runtimeContext.nodeEnv,
    vercelEnv: runtimeContext.vercelEnv,
    isVercelProd: runtimeContext.isVercelProd
  });
}
