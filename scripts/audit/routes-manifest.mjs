#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CANONICAL_APP_ROOT = process.env.CANONICAL_APP_ROOT || 'app';
const appRoot = path.join(ROOT, CANONICAL_APP_ROOT);

const PAGE_RE = /page\.(tsx?|jsx?)$/;
const LAYOUT_RE = /layout\.(tsx?|jsx?)$/;
const IMPORT_RE = /import\s+(?:[^'"\n]+\s+from\s+)?["']([^"']+)["']/g;

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function segmentToRoute(seg) {
  if (seg.startsWith('(') && seg.endsWith(')')) return null;
  if (seg.startsWith('@')) return null;
  if (seg === 'page') return null;
  return seg;
}

function fileToRoute(filePath) {
  const rel = path.relative(appRoot, filePath).replace(/\\/g, '/');
  const noExt = rel.replace(/(^|\/)page\.(tsx?|jsx?)$/, '');
  if (noExt.length === 0) return '/';
  const parts = noExt.split('/').map(segmentToRoute).filter(Boolean);
  const route = '/' + parts.join('/');
  return route === '' ? '/' : route;
}

async function main() {
  const stat = await fs.stat(appRoot).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Canonical app root not found: ${CANONICAL_APP_ROOT}`);
  }

  const files = await walk(appRoot);
  const pages = files.filter((file) => PAGE_RE.test(file)).sort();
  const layouts = new Set(files.filter((file) => LAYOUT_RE.test(file)).map((file) => path.dirname(file)));

  const manifest = pages.map((file) => {
    const route = fileToRoute(file);
    const dir = path.dirname(file);
    return {
      route,
      pageFile: path.relative(ROOT, file).replace(/\\/g, '/'),
      hasLayout: layouts.has(dir)
    };
  });

  const importsMap = {};
  for (const file of pages) {
    const source = await fs.readFile(file, 'utf8');
    const localImports = new Set();
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? '';
      if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@/')) {
        localImports.add(spec);
      }
    }
    importsMap[path.relative(ROOT, file).replace(/\\/g, '/')] = [...localImports].sort();
  }

  const jsonPath = path.join(ROOT, 'docs/audits/routes.manifest.json');
  const mdPath = path.join(ROOT, 'docs/audits/routes.manifest.md');
  const importsPath = path.join(ROOT, 'docs/audits/routes.imports.json');

  await fs.writeFile(jsonPath, `${JSON.stringify({ canonicalAppRoot: CANONICAL_APP_ROOT, routes: manifest }, null, 2)}\n`);
  await fs.writeFile(importsPath, `${JSON.stringify({ canonicalAppRoot: CANONICAL_APP_ROOT, imports: importsMap }, null, 2)}\n`);

  const rows = manifest.map((row) => `| \`${row.route}\` | \`${row.pageFile}\` | ${row.hasLayout ? 'Yes' : 'No'} |`).join('\n');
  const md = `# Route Manifest\n\nCanonical app root: \`${CANONICAL_APP_ROOT}\`\n\n| Route | Page file | Layout in same segment |\n| --- | --- | --- |\n${rows}\n`;
  await fs.writeFile(mdPath, md);

  console.log(`Wrote ${manifest.length} routes to docs/audits/routes.manifest.json`);
}

main().catch((error) => {
  console.error(`routes-manifest failed: ${error.message}`);
  process.exit(1);
});
