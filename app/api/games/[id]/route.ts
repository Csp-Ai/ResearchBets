import { NextResponse } from 'next/server';

import { errorEnvelope, resolveTraceId, successEnvelope } from '../../../../src/core/api/envelope';
import { resolveGameFromRegistry } from '../../../../src/core/games/registry';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const traceId = resolveTraceId(request);
  const game = resolveGameFromRegistry(params.id);

  if (!game) {
    return NextResponse.json(errorEnvelope({ traceId, errorCode: 'not_found', source: 'demo' }), {
      status: 404
    });
  }

  return NextResponse.json(
    successEnvelope({
      traceId,
      data: { game },
      source: game.source
    })
  );
}
