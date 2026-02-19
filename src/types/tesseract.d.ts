declare module 'tesseract.js' {
  export type RecognizeResult = { data: { text: string } };
  export function createWorker(...args: any[]): any;
  const Tesseract: any;
  export default Tesseract;
}
