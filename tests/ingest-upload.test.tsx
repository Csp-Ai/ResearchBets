// @vitest-environment jsdom

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import IngestionPage from '@/app/(product)/ingest/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: () => '' })
}));

vi.mock('@/src/core/pipeline/runSlip', () => ({
  runSlip: vi.fn(async () => 'trace-upload-1')
}));

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async (_lang: string, _oem: number, options: { logger?: (input: { status: string; progress: number }) => void }) => ({
    recognize: vi.fn(async () => {
      options.logger?.({ status: 'recognizing text', progress: 0.42 });
      return { data: { text: 'Leg A over 22.5 points\nLeg B over 5.5 assists' } };
    }),
    terminate: vi.fn(async () => undefined)
  }))
}));

describe('ingest upload screenshot flow', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('renders upload screenshot action', () => {
    renderWithProviders(<IngestionPage />);

    expect(screen.getByRole('button', { name: 'Upload screenshot' })).toBeTruthy();
  });

  it('populates slip text from OCR and keeps save flow available', async () => {
    renderWithProviders(<IngestionPage />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'slip.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByDisplayValue(/Leg A over 22.5 points/)).toBeTruthy());
    await waitFor(() => expect((screen.getAllByRole('button', { name: 'Save slip' })[0] as HTMLButtonElement).disabled).toBe(false));
  });
});
