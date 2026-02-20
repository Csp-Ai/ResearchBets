import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/src/services/supabase';

type MirrorMatch = {
  path: string;
  content: string;
  metadata: {
    start_line?: number;
    end_line?: number;
  };
  similarity: number;
};

const MODEL = 'text-embedding-3-small';
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const MAX_CONTEXT_CHARS = 40_000;

const unauthorized = () => NextResponse.json({ error: 'Not found.' }, { status: 404 });

const assertDevelopmentAccess = (request: Request): NextResponse | null => {
  if (process.env.NODE_ENV !== 'development') {
    return unauthorized();
  }

  const adminSecret = process.env.ADMIN_SECRET_KEY?.trim();
  if (adminSecret) {
    const headerSecret = request.headers.get('x-admin-secret')?.trim();
    if (!headerSecret || headerSecret !== adminSecret) {
      return unauthorized();
    }
  }

  return null;
};

const createEmbedding = async (message: string): Promise<number[]> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for /api/dev/mirror/chat.');
  }

  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: MODEL, input: message })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding || embedding.length !== 1536) {
    throw new Error('Embedding response did not return a 1536-dimensional vector.');
  }

  return embedding;
};

export async function POST(request: Request) {
  const accessError = assertDevelopmentAccess(request);
  if (accessError) return accessError;

  try {
    const body = (await request.json()) as {
      message?: unknown;
      pathPrefix?: unknown;
      topK?: unknown;
    };

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix.trim() : '';
    const topK = typeof body.topK === 'number' ? Math.min(Math.max(Math.floor(body.topK), 1), 20) : 5;

    if (!message) {
      return NextResponse.json({ error: 'message is required.' }, { status: 400 });
    }

    const embedding = await createEmbedding(message);
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase.rpc('match_code', {
      query_embedding: embedding,
      match_count: topK,
      path_prefix: pathPrefix || null
    });

    if (error) {
      return NextResponse.json({ error: `Failed to match code: ${error.message}` }, { status: 500 });
    }

    const matches = ((data ?? []) as MirrorMatch[]).filter((row) => row.path && row.content);

    let usedChars = 0;
    let wasTruncated = false;
    const contextChunks: string[] = [];

    for (const match of matches) {
      const start = Number(match.metadata?.start_line ?? 0);
      const end = Number(match.metadata?.end_line ?? 0);
      const chunkText = `Path: ${match.path}\nLines: ${start || '?'}-${end || '?'}\nSimilarity: ${match.similarity.toFixed(4)}\n${match.content}`;

      if (usedChars + chunkText.length > MAX_CONTEXT_CHARS) {
        wasTruncated = true;
        break;
      }

      contextChunks.push(chunkText);
      usedChars += chunkText.length;
    }

    const sourceLines = matches
      .map((match) => {
        const start = Number(match.metadata?.start_line ?? 0);
        const end = Number(match.metadata?.end_line ?? 0);
        return `- ${match.path}:${start || '?'}-${end || '?'}`;
      })
      .join('\n');

    const promptContext = contextChunks.length > 0 ? contextChunks.join('\n\n---\n\n') : 'No matching chunks found.';

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system:
        'You are the ResearchBets Lead Architect. Use ONLY the provided code chunks. Cite sources. If missing context, request the file/path.',
      prompt: [
        `User question:\n${message}`,
        wasTruncated ? `Context was truncated at ${MAX_CONTEXT_CHARS} chars.` : '',
        `Code chunks:\n${promptContext}`,
        'Answer constraints:',
        '- Keep answers grounded in provided chunks only.',
        '- End with a "Sources" section with bullet points in format: path:start-end.',
        '- If suggesting changes, include a unified diff in a fenced ```diff block.',
        `Available sources:\n${sourceLines || '- none'}`
      ]
        .filter(Boolean)
        .join('\n\n')
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
