import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const blocked = ['fonts.googleapis', 'fonts.gstatic'];

const scanWithRg = (target) => {
  try {
    return execSync(`rg -n "${blocked.join('|')}" ${target}`, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (typeof error?.status === 'number' && error.status === 1) return '';
    throw error;
  }
};

const sourceMatches = [scanWithRg('app'), scanWithRg('src')].filter(Boolean).join('\n');
if (sourceMatches) {
  console.error('Font guard failed: external Google Font endpoints found in source files.');
  console.error(sourceMatches);
  process.exit(1);
}

const htmlMatches = [];
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!fullPath.endsWith('.html')) continue;
    const content = readFileSync(fullPath, 'utf8');
    if (blocked.some((token) => content.includes(token))) htmlMatches.push(fullPath);
  }
};

walk('.next');
if (htmlMatches.length > 0) {
  console.error('Font guard failed: built HTML contains external Google Font endpoints.');
  console.error(htmlMatches.join('\n'));
  process.exit(1);
}

console.log('font-import-guard: passed');
