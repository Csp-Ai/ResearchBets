import { readFile } from 'node:fs/promises';

const assertIncludes = (source, snippet, label) => {
  if (!source.includes(snippet)) {
    throw new Error(`${label} missing snippet: ${snippet}`);
  }
};

const checkPageGuard = async (filePath) => {
  const source = await readFile(filePath, 'utf8');
  assertIncludes(source, "process.env.NODE_ENV !== 'development'", filePath);
  assertIncludes(source, 'notFound()', filePath);
  console.log(`${filePath}: production guard present`);
};

const checkApiGuard = async (filePath) => {
  const source = await readFile(filePath, 'utf8');
  assertIncludes(source, "process.env.NODE_ENV !== 'development'", filePath);
  assertIncludes(source, "status: 404", filePath);
  console.log(`${filePath}: production 404 guard present`);
};

await checkPageGuard('app/dev/mirror/page.tsx');
await checkPageGuard('app/dev/dashboard/page.tsx');
await checkApiGuard('app/api/dev/mirror/status/route.ts');
await checkApiGuard('app/api/dev/mirror/chat/route.ts');

console.log('prod-like smoke passed');
