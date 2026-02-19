import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

const spawnSyncMock = vi.fn();

vi.mock('node:child_process', () => ({
  spawnSync: spawnSyncMock
}));

const { default: runNpm } = await import('./runNpm.mjs');

describe('runNpm', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    spawnSyncMock.mockReset();
  });

  it('uses npm_execpath with process.execPath when npm_execpath is set', () => {
    vi.stubEnv('npm_execpath', '/tmp/npm-cli.js');
    spawnSyncMock.mockReturnValue({ status: 0 });

    runNpm(['run', 'env:check']);

    expect(spawnSyncMock).toHaveBeenCalledWith(
      process.execPath,
      ['/tmp/npm-cli.js', 'run', 'env:check'],
      expect.objectContaining({ stdio: 'inherit', env: process.env })
    );
  });

  it('uses npm.cmd on win32 when npm_execpath is not set', () => {
    delete process.env.npm_execpath;
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    spawnSyncMock.mockReturnValue({ status: 0 });

    runNpm(['run', 'supabase:schema:check']);

    expect(spawnSyncMock).toHaveBeenCalledWith(
      'npm.cmd',
      ['run', 'supabase:schema:check'],
      expect.objectContaining({ stdio: 'inherit', env: process.env })
    );
  });
});
