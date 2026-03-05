import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/odds/probe route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.env.ODDS_API_KEY = 'super-secret-key';
    process.env.ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
  });

  it('returns success payload when sports endpoint is reachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('[]')
      })
    );

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      runtime: 'nodejs',
      urlPath: '/v4/sports',
      queryKeys: ['apiKey'],
      status: 200,
      contentType: 'application/json'
    });
    expect(JSON.stringify(payload)).not.toContain('super-secret-key');
    expect(JSON.stringify(payload)).not.toContain('apiKey=');
  });

  it('returns sanitized snippet for unauthorized responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('401 apiKey=super-secret-key bad key')
      })
    );

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.reason).toBe('http_401');
    expect(payload.bodySnippet).toContain('apiKey=[redacted]');
    expect(payload.bodySnippet).not.toContain('super-secret-key');
    expect(JSON.stringify(payload)).not.toContain('apiKey=super-secret-key');
  });

  it('classifies pre-http dns errors and keeps output secret-safe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }))
    );

    const { GET } = await import('../route');
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.reason).toBe('dns');
    expect(payload.errorCode).toBe('ENOTFOUND');
    expect(JSON.stringify(payload)).not.toContain('super-secret-key');
    expect(JSON.stringify(payload)).not.toContain('apiKey=');
  });
});
