export const COPY_TOAST_EVENT = 'rb:copy-toast';

export function emitCopyToast(message = 'Copied') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COPY_TOAST_EVENT, { detail: { message } }));
}

export async function copyToClipboard(value: string, message = 'Copied') {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  await navigator.clipboard.writeText(value);
  emitCopyToast(message);
  return true;
}
