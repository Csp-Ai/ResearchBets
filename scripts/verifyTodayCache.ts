const BASE_URL = process.env.RESEARCHBETS_PROD_URL;
const CRON_SECRET = process.env.CRON_SECRET;

type TodayResponse = {
  data?: {
    mode?: string;
    debug?: {
      cacheHit?: boolean;
      didLiveFetch?: boolean;
    };
  };
  debug?: {
    cacheHit?: boolean;
    didLiveFetch?: boolean;
  };
};

function requireEnv(name: 'RESEARCHBETS_PROD_URL' | 'CRON_SECRET', value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function warmCache(baseUrl: string, cronSecret: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/today/warm`, {
    method: 'POST',
    headers: {
      'x-cron-secret': cronSecret,
    },
  });

  const body = await parseJson(response);

  console.log('WARM RESPONSE');

  if (!response.ok) {
    throw new Error(`Warm endpoint failed (${response.status}): ${JSON.stringify(body)}`);
  }
}

async function fetchToday(baseUrl: string, callNumber: 1 | 2): Promise<TodayResponse> {
  const response = await fetch(`${baseUrl}/api/today?debug=1`);
  const body = (await parseJson(response)) as TodayResponse | null;

  console.log(`TODAY CALL ${callNumber}`);

  if (!response.ok || !body) {
    throw new Error(`Today endpoint call ${callNumber} failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

function getMode(payload: TodayResponse): string {
  return payload.data?.mode ?? 'unknown';
}

function getDebug(payload: TodayResponse): { cacheHit: boolean; didLiveFetch: boolean } {
  const debug = payload.debug ?? payload.data?.debug;
  return {
    cacheHit: debug?.cacheHit === true,
    didLiveFetch: debug?.didLiveFetch === true,
  };
}

async function main(): Promise<void> {
  try {
    const baseUrl = requireEnv('RESEARCHBETS_PROD_URL', BASE_URL).replace(/\/$/, '');
    const cronSecret = requireEnv('CRON_SECRET', CRON_SECRET);

    await warmCache(baseUrl, cronSecret);
    const call1 = await fetchToday(baseUrl, 1);
    const call2 = await fetchToday(baseUrl, 2);

    const call1Mode = getMode(call1);
    const call2Mode = getMode(call2);
    const call2Debug = getDebug(call2);

    const cacheWorking = call2Debug.cacheHit === true && call2Debug.didLiveFetch === false;

    console.log('------ ResearchBets Cache Verification ------');
    console.log('Note: This script uses manual warm endpoint invocation and does not require platform cron support.');
    console.log('');
    console.log('Warm status: OK');
    console.log(`Today call 1 mode: ${call1Mode}`);
    console.log(`Today call 2 mode: ${call2Mode}`);
    console.log(`Cache hit: ${String(call2Debug.cacheHit)}`);
    console.log(`Live fetch: ${String(call2Debug.didLiveFetch)}`);
    console.log('');
    console.log(cacheWorking ? 'RESULT: CACHE WORKING ✓' : 'RESULT: CACHE NOT WORKING ✗');

    if (!cacheWorking) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unknown verification error');
    process.exitCode = 1;
  }
}

void main();
