import type { RecognizeResult } from 'tesseract.js';

type OcrWorker = {
  recognize: (image: string | File) => Promise<RecognizeResult>;
  terminate: () => Promise<unknown>;
};

type RunOcrOptions = {
  signal?: AbortSignal;
  onWorkerChange?: (worker: OcrWorker | null) => void;
};

const normalizeOcrText = (rawText: string): string => rawText
  .replace(/\r/g, '\n')
  .replace(/[•●◦▪▸►]/g, '\n')
  .replace(/\t+/g, ' ')
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .join('\n');

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError';
};

const abortError = () => new DOMException('OCR canceled by user.', 'AbortError');

export async function runOcr(file: File, onProgress?: (p: string) => void, options: RunOcrOptions = {}): Promise<string> {
  const { signal, onWorkerChange } = options;
  let worker: OcrWorker | null = null;
  let imageUrl: string | null = null;

  if (signal?.aborted) {
    throw abortError();
  }

  try {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng', 1, {
      logger: (message: { status?: string; progress?: number }) => {
        if (message.status === 'recognizing text' && typeof message.progress === 'number') {
          onProgress?.(`Reading text… ${Math.round(message.progress * 100)}%`);
        }
      }
    });

    const activeWorker = worker;
    if (!activeWorker) {
      throw new Error('Could not initialize OCR worker.');
    }
    onWorkerChange?.(activeWorker);

    if (signal?.aborted) {
      throw abortError();
    }

    const abortHandler = () => {
      void activeWorker.terminate();
    };

    signal?.addEventListener('abort', abortHandler, { once: true });

    imageUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    const result = await activeWorker.recognize(imageUrl ?? file);
    const normalized = normalizeOcrText(result.data.text ?? '');

    if (!normalized) {
      throw new Error('Could not read enough text from the screenshot. Try another image or edit the text manually.');
    }

    return normalized;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error('Could not read the screenshot. Try another image or paste your slip manually.');
  } finally {
    if (imageUrl && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(imageUrl);
    }
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
    onWorkerChange?.(null);
  }
}
