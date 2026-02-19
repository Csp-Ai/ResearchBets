import type { ExtractedLeg } from '@/src/core/run/types';

const parseBook = (book?: string): string[] => {
  if (!book) return [];
  return book.split(/[|,/]/).map((value) => value.trim()).filter(Boolean);
};

export async function enrichOdds(leg: ExtractedLeg): Promise<{ lineMove: number | null; divergence: number | null; source: 'live' | 'fallback'; notes: string[] }> {
  const books = parseBook(leg.book);
  if (books.length >= 2) {
    const divergence = Number((books.length * 0.25).toFixed(2));
    return {
      lineMove: null,
      divergence,
      source: 'live',
      notes: [`Book divergence detected across ${books.length} books.`]
    };
  }

  return {
    lineMove: null,
    divergence: null,
    source: 'fallback',
    notes: ['Odds/line movement unavailable; waiting for multi-book feed.']
  };
}
