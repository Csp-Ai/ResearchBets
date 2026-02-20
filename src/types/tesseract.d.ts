declare module 'tesseract.js' {
  export type RecognizeResult = { data: { text: string } };
  export type TesseractWorker = {
    recognize: (image: string | ArrayBuffer | Blob) => Promise<RecognizeResult>;
    terminate: () => Promise<void>;
  };
  export function createWorker(...args: unknown[]): Promise<TesseractWorker>;
  const Tesseract: {
    createWorker: typeof createWorker;
  };
  export default Tesseract;
}
