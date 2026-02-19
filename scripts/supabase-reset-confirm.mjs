#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline/promises';

async function main() {
  const forceYes = process.argv.includes('--yes');

  if (!forceYes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      'This will run `supabase db reset --linked` and reset the linked database. Continue? (y/N) '
    );
    rl.close();

    if (answer.trim().toLowerCase() !== 'y') {
      console.log('Cancelled Supabase reset.');
      process.exit(0);
    }
  }

  execFileSync('supabase', ['db', 'reset', '--linked'], { stdio: 'inherit' });
}

main().catch((error) => {
  console.error('❌ Failed to run supabase reset:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
