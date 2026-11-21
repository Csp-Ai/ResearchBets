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
  const timeoutMs = 45_000;
  let worker: OcrWorker | null = null;
  let imageUrl: string | null = null;
  let finished = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let rejectStopped: (error: Error) => void = () => undefined;
  const abort = () => rejectStopped(abortError());

  if (signal?.aborted) throw abortError();

  const stopped = new Promise<never>((_, reject) => {
    rejectStopped = reject;
    timeoutId = setTimeout(() => reject(new Error('Screenshot OCR timed out.')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
  });

  const recognize = async () => {
    const { createWorker } = await import('tesseract.js');
    if (finished) return '';
    const activeWorker = await createWorker('eng', 1, {
      workerPath: '/ocr-assets/worker.min.js',
      corePath: '/ocr-assets',
      langPath: '/ocr-assets',
      workerBlobURL: false,
      logger: (message: { status?: string; progress?: number }) => {
        if (!finished && message.status === 'recognizing text' && typeof message.progress === 'number') {
          onProgress?.(`Reading text… ${Math.round(message.progress * 100)}%`);
        }
      }
    });

    if (finished) {
      void activeWorker.terminate().catch(() => undefined);
      return '';
    }

    worker = activeWorker;
    onWorkerChange?.(activeWorker);
    imageUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    const result = await activeWorker.recognize(imageUrl ?? file);
    return normalizeOcrText(result.data.text ?? '');
  };

  try {
    const normalized = await Promise.race([recognize(), stopped]);
    if (!normalized) {
      throw new Error('Could not read enough text from the screenshot.');
    }
    return normalized;
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error('Could not read the screenshot. Try another image or paste your slip manually.');
  } finally {
    finished = true;
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abort);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    // Terminating a worker may leave its recognition promise pending.
    const activeWorker = worker as OcrWorker | null;
    void activeWorker?.terminate().catch(() => undefined);
    onWorkerChange?.(null);
  }
}
