// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { createWorker } from 'tesseract.js';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import IngestionPage from '@/app/(product)/ingest/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: () => null })
}));
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async (_lang: string, _oem: number, options: { logger?: (input: { status: string; progress: number }) => void }) => ({
    recognize: vi.fn(async (image: string | File) => {
      if (image instanceof File ? image.name === 'blurred.png' : image === 'blob:blurred.png') throw new Error('unreadable image');
      options.logger?.({ status: 'recognizing text', progress: 0.42 });
      return { data: { text: 'Leg A over 22.5 points\nLeg B over 5.5 assists' } };
    }),
    terminate: vi.fn(async () => undefined)
  }))
}));

describe('screenshot-first ResearchBets ingestion', () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        ticketId: 'candidate-one',
        sourceHint: 'screenshot',
        rawSlipText: 'Leg A over 22.5 points',
        createdAt: '2026-11-21T00:00:00.000Z',
        legs: [{
          legId: 'leg-1', league: 'Unknown', player: 'Leg A', marketType: 'points',
          marketLabel: 'Points', threshold: 22.5, direction: 'over', source: 'screenshot',
          parseConfidence: 'high', needsReview: true, rawText: 'Leg A over 22.5 points'
        }]
      }
    }), { status: 200 })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('presents screenshot-first upload and manual-paste alternatives', () => {
    renderWithProviders(<IngestionPage />);
    expect(screen.getByRole('button', { name: 'Upload Your Parlay' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take a picture' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Build manually' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Paste ticket' }));
    expect(screen.getByRole('button', { name: 'Review extracted ticket' })).toBeTruthy();
  });

  it('blocks incomplete 10-market Kalshi screenshots instead of analyzing four visible legs as ten', async () => {
    const players = ['Test Team Alpha', 'Test Team Bravo', 'Test Team Charlie', 'Test Team Delta'];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: { ticketId: 'candidate-kalshi', legs: players.map((player, index) => ({
        legId: 'leg-' + index, league: 'NCAAF', player,
        marketType: 'moneyline', marketLabel: 'Moneyline (contract: YES)',
        threshold: 0, direction: 'over', directionObserved: true,
        quotedContractPercent: 60 + index * 4, contractSide: 'yes',
        source:'screenshot',parseConfidence:'medium',needsReview:true
      })) }
    }), {status: 200})));
    renderWithProviders(<IngestionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste ticket' }));
    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {
      target: { value: ['Kalshi','10 MARKET COMBO','COST $12.40','MAX PAYOUT $1,234.56',
        'Test Team Alpha to win 60%','Test Team Bravo to win 64%',
        'Test Team Charlie to win 68%','Test Team Delta to win 72%'].join('\n') }
    });
    fireEvent.click(screen.getByRole('button',{name:'Review extracted ticket'}));
    await waitFor(() => expect(screen.getByText(/Your Ticket · 4 legs/)).toBeTruthy());
    expect(screen.getByText(/4 of 10 selections recognized/)).toBeTruthy();
    expect(screen.getByText(/Screenshot contract quote: 60%/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Analyze My Ticket'}));
    expect(screen.getAllByText(/4 of 10 selections recognized/).length).toBeGreaterThan(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('withholds conventional X-Ray on a complete prediction-contract screenshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true, data: { ticketId: 'complete-kalshi', legs: [{
        legId:'leg-1', league:'NBA',player:'Test Team',
        marketType:'moneyline',marketLabel:'Moneyline (contract: YES)',
        threshold:0,direction:'over',directionObserved:true,
        source:'screenshot', parseConfidence:'medium',needsReview:true
      }] }
    }),{status:200})));
    renderWithProviders(<IngestionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste ticket' }));
    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {
      target:{value:'Kalshi\n1 MARKET COMBO\nTest Team to win 75%'}
    });
    fireEvent.click(screen.getByRole('button',{name:'Review extracted ticket'}));
    await waitFor(() => expect(screen.getByText(/Your Ticket · 1 legs/)).toBeTruthy());
    expect(screen.getByText(/Review-only mode: specialized ticket pricing/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Analyze My Ticket'}));
    expect(screen.getByText(/canonical X-Ray analysis is paused/)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('warns about repeated OCR candidates without silently deleting either leg', async () => {
    const leg = {
      legId: 'leg-1', league: 'NBA', player: 'Jayson Tatum',
      marketType: 'points', marketLabel: 'Points', threshold: 29.5,
      direction: 'over', directionObserved: true, thresholdObserved: true,
      odds: '-110', source: 'screenshot', parseConfidence: 'high',
      teams: 'BOS @ NYK', rawText: 'Jayson Tatum over 29.5 points -110'
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true, data: { ticketId: 'dupe-screenshot', legs: [leg, {...leg, legId:'leg-2'}] }
    }), { status: 200 })));
    renderWithProviders(<IngestionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste ticket' }));
    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {
      target: { value: 'Jayson Tatum over 29.5 points -110\nJayson Tatum over 29.5 points -110' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review extracted ticket' }));
    await waitFor(() => expect(screen.getByText(/Your Ticket · 2 legs/)).toBeTruthy());
    expect(screen.getByText(/Possible duplicate of leg 1/)).toBeTruthy();
    expect(screen.getAllByRole('button',{name:'Remove row'})).toHaveLength(2);
    expect(screen.getAllByRole('checkbox',{name:/Confirm leg/})).toHaveLength(2);
  });

  it('requires explicit direction and threshold corrections when OCR did not observe them', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true, data: { ticketId:'missing-direction', legs: [{
        legId:'leg-1', league:'NBA', player:'Jayson Tatum', marketType:'points',
        marketLabel:'Points', threshold:0, thresholdObserved:false,
        direction:'over', directionObserved:false, source:'screenshot', parseConfidence:'low'
      }] }
    }), {status:200})));
    renderWithProviders(<IngestionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste ticket' }));
    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {target: {value:'Jayson Tatum points'}});
    fireEvent.click(screen.getByRole('button',{name:'Review extracted ticket'}));
    await waitFor(() => expect(screen.getByText(/Your Ticket · 1 legs/)).toBeTruthy());
    expect(screen.getByText(/Direction was not visible/)).toBeTruthy();
    expect(screen.getByRole('checkbox',{name:/Confirm leg 1/})).toHaveProperty('disabled',true);
    const leg = screen.getByRole('region',{name:'Leg 1'});
    const direction = leg.querySelectorAll('select')[2];
    // Direction and threshold are visibly unresolved rather than guessed.
    expect((leg.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('');
    expect(direction?.value).toBe('');
  });

  it('keeps partial OCR visible and requires acknowledgment of missing screenshot evidence', async () => {
    renderWithProviders(<IngestionPage />);
    const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [
      new File(['first'], 'one.png', { type:'image/png' }),
      new File(['unreadable'], 'blurred.png', { type:'image/png' })
    ] } });
    await waitFor(() => expect(screen.getByText(/Your Ticket · 1 legs/)).toBeTruthy());
    expect(screen.getByText(/Could not read screenshot 2/)).toBeTruthy();
    expect(screen.getByRole('checkbox', {name:/I reviewed the unreadable screenshot/})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Analyze My Ticket'}));
    expect(screen.getByText(/Some screenshots could not be read. Compare them/)).toBeTruthy();
    const calls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(calls.filter((path) => path.includes('/api/slips/parseText'))).toHaveLength(1);
  });

  it('keeps both screenshots and tracks which one produced each leg', async () => {
    renderWithProviders(<IngestionPage />);
    const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [
      new File(['screen-one'], 'one.png', { type: 'image/png' }),
      new File(['screen-two'], 'two.png', { type: 'image/png' })
    ] } });
    await waitFor(() => expect(screen.getByText(/Your Ticket · 2 legs/)).toBeTruthy());
    expect(screen.getByText('Source: screenshot 1')).toBeTruthy();
    expect(screen.getByText('Source: screenshot 2')).toBeTruthy();
    expect(screen.getByText(/Possible duplicate of leg 1/)).toBeTruthy();
    const calls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(calls.filter((path) => path.includes('/api/slips/parseText'))).toHaveLength(2);
    expect(calls.some((path) => path.includes('/api/bettor-memory/upload'))).toBe(false);
  });

  it('replaces an unreadable screenshot with its crop and preserves the other image index', async () => {
    const originalUrl = globalThis.URL;
    class PreviewURL extends originalUrl {
      static createObjectURL(file: Blob) { return 'blob:' + (file as File).name; }
      static revokeObjectURL() {}
    }
    vi.stubGlobal('URL', PreviewURL);
    vi.mocked(createWorker).mockClear();
    renderWithProviders(<IngestionPage />);
    fireEvent.change(screen.getByLabelText('Select screenshots'), { target: { files: [
      new File(['first'], 'one.png', { type: 'image/png' }),
      new File(['unreadable'], 'blurred.png', { type: 'image/png' })
    ] } });
    // The OCR mock recognizes the name through the object URL.
    await screen.findByText(/Could not read screenshot 2/);
    expect(screen.getByRole('button', { name: 'Retry OCR' })).toBeTruthy();
    fireEvent.click(screen.getByText('View or replace screenshots (2)'));
    fireEvent.click(screen.getByRole('button', { name: 'Replace image 2' }));
    fireEvent.change(screen.getByLabelText('Select cropped screenshot'), { target: { files: [
      new File(['cropped'], 'crop.png', { type: 'image/png' })
    ] } });
    await screen.findByText(/Your Ticket · 2 legs/);
    expect(screen.getByText('Source: screenshot 1')).toBeTruthy();
    expect(screen.getByText('Source: screenshot 2')).toBeTruthy();
    expect(vi.mocked(createWorker)).toHaveBeenCalledTimes(3);
  });

  it('extracts locally without uploading the original unless opted in', async () => {
    renderWithProviders(<IngestionPage />);
    const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const file = new File(['dummy'], 'slip.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit extracted text' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Edit extracted text' }));
    expect(screen.getByDisplayValue(/Leg A over 22.5 points/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Your Ticket · 1 legs/)).toBeTruthy());
    expect(screen.getByRole('checkbox', { name: /Confirm leg 1/ })).toHaveProperty('disabled', true);
    const calls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(calls.some((path) => path.includes('/api/bettor-memory/upload'))).toBe(false);
    expect(calls.some((path) => path.includes('/api/slips/parseText'))).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });
});
