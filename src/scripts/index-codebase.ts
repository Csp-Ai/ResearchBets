import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getSupabaseServiceClient } from '../core/supabase/service';

type SupportedLanguage = 'ts' | 'tsx' | 'js' | 'sql' | 'md';
type ChunkType = 'component' | 'api_route' | 'agent' | 'sql' | 'doc' | 'util';

type Chunk = {
  path: string;
  content: string;
  metadata: {
    language: SupportedLanguage;
    start_line: number;
    end_line: number;
    chunk_type: ChunkType;
    checksum: string;
    model: 'text-embedding-3-small';
    indexed_at: string;
  };
  checksum: string;
};

type ExistingChunkRecord = {
  id: string;
  checksum: string;
  metadata: {
    chunk_type?: string;
    start_line?: number | string;
    end_line?: number | string;
  };
};

const ROOT_DIR = process.cwd();
const INCLUDE_ROOTS = ['app', 'src', 'supabase/migrations', 'docs', 'scripts'];
const EXCLUDED_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git', '.vercel']);
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CHARS = 12_000;
const MAX_LINES = 250;
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY. Set it in .env.local to generate embeddings.');
}

const shouldIgnoreFile = (relativePath: string): boolean => {
  const normalized = relativePath.replaceAll('\\', '/');
  const lower = normalized.toLowerCase();
  const baseName = path.basename(lower);

  if (baseName.startsWith('.env')) {
    return true;
  }

  if (baseName === 'keys.ts') {
    return true;
  }

  return /secret|token|credential/.test(lower);
};

const detectLanguage = (filePath: string): SupportedLanguage | null => {
  if (filePath.endsWith('.ts')) return 'ts';
  if (filePath.endsWith('.tsx')) return 'tsx';
  if (filePath.endsWith('.js')) return 'js';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.md')) return 'md';
  return null;
};

const detectChunkType = (relativePath: string, language: SupportedLanguage): ChunkType => {
  const normalized = relativePath.replaceAll('\\', '/');

  if (language === 'sql') return 'sql';
  if (language === 'md') return 'doc';
  if (/\/api\//.test(normalized)) return 'api_route';
  if (/agent/i.test(normalized)) return 'agent';
  if (/component|\/ui\//i.test(normalized) || normalized.endsWith('.tsx')) return 'component';
  return 'util';
};

const checksum = (value: string): string => createHash('sha256').update(value).digest('hex');

const readDirectoryRecursive = async (dirPath: string): Promise<string[]> => {
  const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of dirEntries) {
    const resolved = path.join(dirPath, entry.name);
    const relative = path.relative(ROOT_DIR, resolved);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      files.push(...(await readDirectoryRecursive(resolved)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (shouldIgnoreFile(relative)) {
      continue;
    }

    const language = detectLanguage(relative);
    if (!language) {
      continue;
    }

    files.push(relative);
  }

  return files;
};

const computeBoundaries = (lines: string[]): number[] => {
  const boundaries = new Set<number>([1]);
  let braceDepth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    const lineNumber = index + 1;

    if (
      braceDepth === 0 &&
      (/^export\s/.test(trimmed) ||
        /^async\s+function\s+/.test(trimmed) ||
        /^function\s+/.test(trimmed) ||
        /^class\s+/.test(trimmed) ||
        /^const\s+[A-Z]/.test(trimmed))
    ) {
      boundaries.add(lineNumber);
    }

    const openBraces = (line.match(/{/g) ?? []).length;
    const closeBraces = (line.match(/}/g) ?? []).length;
    braceDepth += openBraces - closeBraces;

    if (braceDepth < 0) {
      braceDepth = 0;
    }
  }

  return [...boundaries].sort((a, b) => a - b);
};

const chunkFile = (relativePath: string, content: string, language: SupportedLanguage): Chunk[] => {
  const lines = content.split(/\r?\n/);

  if (lines.length === 0) {
    return [];
  }

  const boundaries = computeBoundaries(lines);
  boundaries.push(lines.length + 1);

  const chunks: Chunk[] = [];
  let currentStart = boundaries[0] ?? 1;
  let currentLines: string[] = [];

  const flushChunk = (endLine: number): void => {
    if (currentLines.length === 0) {
      return;
    }

    const chunkContent = currentLines.join('\n').trim();
    if (!chunkContent) {
      return;
    }

    const digest = checksum(chunkContent);

    chunks.push({
      path: relativePath.replaceAll('\\', '/'),
      content: chunkContent,
      checksum: digest,
      metadata: {
        language,
        start_line: currentStart,
        end_line: endLine,
        chunk_type: detectChunkType(relativePath, language),
        checksum: digest,
        model: EMBEDDING_MODEL,
        indexed_at: new Date().toISOString()
      }
    });
  };

  for (let boundaryIndex = 0; boundaryIndex < boundaries.length - 1; boundaryIndex += 1) {
    const sectionStart = boundaries[boundaryIndex] ?? 1;
    const sectionEnd = (boundaries[boundaryIndex + 1] ?? lines.length + 1) - 1;

    const sectionLines = lines.slice(sectionStart - 1, sectionEnd);
    const sectionText = sectionLines.join('\n');
    const sectionTooLarge = sectionText.length > MAX_CHARS || sectionLines.length > MAX_LINES;

    const wouldOverflow =
      currentLines.length > 0 &&
      (currentLines.length + sectionLines.length > MAX_LINES ||
        currentLines.join('\n').length + sectionText.length > MAX_CHARS);

    if (wouldOverflow) {
      flushChunk(sectionStart - 1);
      currentStart = sectionStart;
      currentLines = [];
    }

    if (sectionTooLarge) {
      const slices = Math.ceil(Math.max(sectionText.length / MAX_CHARS, sectionLines.length / MAX_LINES));
      const linesPerSlice = Math.ceil(sectionLines.length / slices);

      for (let i = 0; i < slices; i += 1) {
        const sliceStartIdx = i * linesPerSlice;
        const sliceEndIdx = Math.min((i + 1) * linesPerSlice, sectionLines.length);
        const sliceLines = sectionLines.slice(sliceStartIdx, sliceEndIdx);
        currentStart = sectionStart + sliceStartIdx;
        currentLines = [...sliceLines];
        flushChunk(sectionStart + sliceEndIdx - 1);
      }

      currentStart = sectionEnd + 1;
      currentLines = [];
      continue;
    }

    if (currentLines.length === 0) {
      currentStart = sectionStart;
    }

    currentLines.push(...sectionLines);
  }

  flushChunk(lines.length);
  return chunks;
};

const getIdentityKey = (record: { metadata: ExistingChunkRecord['metadata'] }): string => {
  const chunkType = record.metadata.chunk_type ?? '';
  const startLine = Number(record.metadata.start_line ?? 0);
  const endLine = Number(record.metadata.end_line ?? 0);
  return `${chunkType}:${startLine}:${endLine}`;
};

const embedTexts = async (inputs: string[]): Promise<number[][]> => {
  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embeddings = payload.data?.map((entry) => entry.embedding ?? []);

  if (!embeddings || embeddings.length !== inputs.length || embeddings.some((vector) => vector.length !== 1536)) {
    throw new Error('OpenAI embeddings payload did not return expected 1536-dimension vectors.');
  }

  return embeddings;
};

const main = async (): Promise<void> => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local to write embeddings to Supabase.');
  }

  const supabase = getSupabaseServiceClient();

  const allFiles: string[] = [];
  for (const includeRoot of INCLUDE_ROOTS) {
    const resolved = path.join(ROOT_DIR, includeRoot);
    try {
      const stat = await fs.stat(resolved);
      if (!stat.isDirectory()) {
        continue;
      }

      allFiles.push(...(await readDirectoryRecursive(resolved)));
    } catch {
      // Skip missing optional directories.
    }
  }

  const uniqueFiles = [...new Set(allFiles)].sort();

  let chunksCreated = 0;
  let chunksSkipped = 0;
  let chunksDeleted = 0;
  let failures = 0;

  for (const relativePath of uniqueFiles) {
    try {
      const absolutePath = path.join(ROOT_DIR, relativePath);
      const fileContent = await fs.readFile(absolutePath, 'utf8');
      const language = detectLanguage(relativePath);
      if (!language) {
        continue;
      }

      const chunks = chunkFile(relativePath, fileContent, language);
      const { data: existingRows, error: existingError } = await supabase
        .from('code_embeddings')
        .select('id, checksum, metadata')
        .eq('path', relativePath);

      if (existingError) {
        throw new Error(`Failed to fetch existing embeddings for ${relativePath}: ${existingError.message}`);
      }

      const existing = (existingRows ?? []) as ExistingChunkRecord[];
      const existingByIdentity = new Map<string, ExistingChunkRecord>();
      for (const row of existing) {
        existingByIdentity.set(getIdentityKey(row), row);
      }

      const chunksToInsert: Chunk[] = [];
      const validSignatures = new Set<string>();

      for (const chunk of chunks) {
        const identityKey = `${chunk.metadata.chunk_type}:${chunk.metadata.start_line}:${chunk.metadata.end_line}`;
        const recordSignature = `${identityKey}:${chunk.checksum}`;
        validSignatures.add(recordSignature);

        const current = existingByIdentity.get(identityKey);
        if (current && current.checksum === chunk.checksum) {
          chunksSkipped += 1;
          continue;
        }

        chunksToInsert.push(chunk);
      }

      const rowsToDelete = existing.filter((row) => {
        const identity = getIdentityKey(row);
        return !validSignatures.has(`${identity}:${row.checksum}`);
      });

      if (rowsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('code_embeddings')
          .delete()
          .in(
            'id',
            rowsToDelete.map((row) => row.id)
          );

        if (deleteError) {
          throw new Error(`Failed to delete stale chunks for ${relativePath}: ${deleteError.message}`);
        }

        chunksDeleted += rowsToDelete.length;
      }

      if (chunksToInsert.length > 0) {
        const embeddings = await embedTexts(chunksToInsert.map((chunk) => chunk.content));
        const rows = chunksToInsert.map((chunk, index) => ({
          path: chunk.path,
          content: chunk.content,
          embedding: embeddings[index],
          metadata: chunk.metadata,
          checksum: chunk.checksum
        }));

        const { error: insertError } = await supabase.from('code_embeddings').insert(rows);
        if (insertError) {
          throw new Error(`Failed to insert chunks for ${relativePath}: ${insertError.message}`);
        }

        chunksCreated += chunksToInsert.length;
      }
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to index ${relativePath}: ${message}`);
    }
  }

  console.log('Project Mirror indexing summary');
  console.log(`- files scanned: ${uniqueFiles.length}`);
  console.log(`- chunks created: ${chunksCreated}`);
  console.log(`- chunks skipped: ${chunksSkipped}`);
  console.log(`- chunks deleted: ${chunksDeleted}`);
  console.log(`- failures: ${failures}`);

  if (failures > 0) {
    process.exitCode = 1;
  }
};

void main();
