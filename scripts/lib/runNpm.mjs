import { spawnSync } from 'node:child_process';
import process from 'node:process';

export default function runNpm(args) {
  const npmExecPath = process.env.npm_execpath;
  const result = npmExecPath
    ? spawnSync(process.execPath, [npmExecPath, ...args], {
        stdio: 'inherit',
        env: process.env
      })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        stdio: 'inherit',
        env: process.env
      });

  if (result.error) {
    const command = npmExecPath ? `${process.execPath} ${npmExecPath}` : process.platform === 'win32' ? 'npm.cmd' : 'npm';
    throw new Error(`Failed to run npm command via ${command}: ${result.error.message}`);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`npm command failed with exit code ${result.status}: npm ${args.join(' ')}`);
  }
}
