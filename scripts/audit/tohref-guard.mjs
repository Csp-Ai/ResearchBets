import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const allowlist = ['src/legacy/', 'app/dev/dashboard/', 'src/components/bettor-os/', 'app/traces/', 'src/components/terminal/RunHeaderStrip.tsx', 'src/components/bettor/BettorFirstBlocks.tsx', 'src/components/bettor/GuidedActionsCard.tsx', 'src/components/landing/PostmortemPreviewCard.tsx', 'src/components/landing/ScoutCardCompact.tsx', 'src/components/landing/BottomCTA.tsx', 'src/components/landing/VerdictMock.tsx', 'app/control/ControlPageClient.tsx', 'app/settings/page.tsx'];
const out = execSync("rg --files app src features -g '*.ts' -g '*.tsx'", { encoding: 'utf8' });
const files = out.trim().split('\n').filter(Boolean);
const violations = [];
for (const file of files) {
  if (allowlist.some((prefix) => file.startsWith(prefix))) continue;
  const text = readFileSync(file, 'utf8');
  if (/router\.(push|replace)\(\s*['"][^'"]+\?/.test(text) || /<Link[^>]+href=['"]\//.test(text)) {
    violations.push(file);
  }
}
if (violations.length) {
  console.error('Non-canonical navigation detected. Use nervous.toHref().');
  violations.slice(0, 80).forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
console.log('toHref guard passed');
