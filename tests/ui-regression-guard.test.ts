import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('v1.0.0 UI regression guards', () => {
  it('does not leak raw JSX snippets on home route source', () => {
    const homePath = fs.existsSync(path.join(process.cwd(), 'app/(home)/page.tsx')) ? 'app/(home)/page.tsx' : 'app/page.tsx';
    const home = read(homePath);
    expect(home).not.toContain('<PostmortemUploadWedge />');
  });

  it('keeps single Stress Test heading surface', () => {
    const stress = read('src/components/research/ResearchPageContent.tsx');
    const analyze = read('src/components/research/AnalyzeTabPanel.tsx');
    const headingCount = (stress.match(/title="Stress Test"/g) ?? []).length + (analyze.match(/>Stress Test</g) ?? []).length;
    expect(headingCount).toBe(1);
  });
});
