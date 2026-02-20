import { readFile } from 'node:fs/promises';

const assertIncludes = (source, snippet, label) => {
  if (!source.includes(snippet)) {
    throw new Error(`${label} missing snippet: ${snippet}`);
  }
};

const checkPageGuard = async (filePath, snippets) => {
  const source = await readFile(filePath, 'utf8');
  for (const snippet of snippets) {
    assertIncludes(source, snippet, filePath);
  }
  console.log(`${filePath}: guard present`);
};

const checkApiGuard = async (filePath) => {
  const source = await readFile(filePath, 'utf8');
  assertIncludes(source, 'status: 404', filePath);
  assertIncludes(source, 'Mirror disabled in launch branch', filePath);
  console.log(`${filePath}: mirror disabled stub present`);
};

await checkPageGuard('app/dev/mirror/page.tsx', ['notFound()']);
await checkPageGuard('app/dev/dashboard/page.tsx', ["process.env.NODE_ENV !== 'development'", 'notFound()']);
await checkApiGuard('app/api/dev/mirror/status/route.ts');
await checkApiGuard('app/api/dev/mirror/chat/route.ts');

console.log('prod-like smoke passed');
