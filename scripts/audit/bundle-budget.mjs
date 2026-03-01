import { existsSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const fileArgIndex = args.findIndex((arg) => arg === '--file');
const file = fileArgIndex >= 0 ? args[fileArgIndex + 1] : process.env.BUNDLE_BUILD_OUTPUT_FILE;
const fingerprintPath = process.env.BUNDLE_FINGERPRINT_FILE ?? 'docs/audit/chunk-fingerprint.md';

if (!file) {
  console.error('[bundle-budget] missing build output file. Pass --file <path> or BUNDLE_BUILD_OUTPUT_FILE.');
  process.exit(1);
}

const text = readFileSync(file, 'utf8');

const sharedMatch = text.match(/First Load JS shared by all\s+([\d.]+)\s*kB/i);
if (!sharedMatch) {
  console.error('[bundle-budget] could not parse shared JS line.');
  process.exit(1);
}

const sharedKb = Number.parseFloat(sharedMatch[1] ?? '0');

const rootRouteMatch = text.match(/^.*[ƒ○●]\s+\/\s+[\d.]+\s*kB\s+([\d.]+)\s*kB.*$/m);
if (!rootRouteMatch) {
  console.error('[bundle-budget] could not parse / route First Load JS.');
  process.exit(1);
}

const rootKb = Number.parseFloat(rootRouteMatch[1] ?? '0');

const SHARED_LIMIT_KB = Number.parseFloat(process.env.BUNDLE_SHARED_LIMIT_KB ?? '90');
const ROOT_LIMIT_KB = Number.parseFloat(process.env.BUNDLE_ROOT_LIMIT_KB ?? '175');

const failures = [];
if (sharedKb > SHARED_LIMIT_KB) failures.push(`shared JS ${sharedKb.toFixed(1)}kB > ${SHARED_LIMIT_KB.toFixed(1)}kB`);
if (rootKb > ROOT_LIMIT_KB) failures.push(`/ route first-load ${rootKb.toFixed(1)}kB > ${ROOT_LIMIT_KB.toFixed(1)}kB`);

if (failures.length > 0) {
  console.error(`[bundle-budget] failed: ${failures.join('; ')}`);
  if (existsSync(fingerprintPath)) {
    console.error(`[bundle-budget] fingerprint report: ${fingerprintPath}`);
  } else {
    console.error(`[bundle-budget] fingerprint report not found at ${fingerprintPath}. Run \`npm run audit:chunk-fingerprint\`.`);
  }
  process.exit(1);
}

console.log(`[bundle-budget] ok (shared=${sharedKb.toFixed(1)}kB, /=${rootKb.toFixed(1)}kB)`);
