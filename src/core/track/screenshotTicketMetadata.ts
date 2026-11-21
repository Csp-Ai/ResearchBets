/**
 * Lossless, conservative metadata adapter for user-supplied sportsbook OCR.
 * This is NOT a new parlay-analysis engine: it only describes what the image
 * claimed so that DraftSlipStore/X-Ray cannot silently analyze a partial slip.
 *
 * Never calculate combined odds from Kalshi percentages, pick'em projections,
 * or SGP sublegs. Screenshot labels are not calibrated probabilities/results.
 */

export type ScreenshotTicketFormat =
  | 'kalshi_combo'
  | 'prizepicks_lineup'
  | 'draftkings_sgp_plus'
  | 'sportsbook_ticket'
  | 'unknown';

export type ScreenshotPricingKind =
  | 'prediction_contract_percent'
  | 'pickem_multiplier'
  | 'official_sgp_price'
  | 'american_odds'
  | 'unavailable';

export type ScreenshotTicketMetadata = {
  format: ScreenshotTicketFormat;
  pricingKind: ScreenshotPricingKind;
  declaredLegCount: number | null;
  declaredCountConflict: boolean;
  screenshotState: 'open_position' | 'closed_position' | 'unknown';
  cost: number | null;
  statedMaxPayout: number | null;
  statedMultiplier: number | null;
  officialCombinedAmericanOdds: string | null;
  hasHiddenLegs: boolean;
  warnings: string[];
};

const dollars = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function labeledMoney(raw: string, pattern: RegExp): number | null {
  const m = raw.match(pattern);
  return dollars(m?.[1]);
}

export function inspectScreenshotTicket(rawText: string): ScreenshotTicketMetadata {
  const text = rawText.slice(0, 20_000);
  // Do not assume an iMessage screenshot containing two different tickets is
  // a single instrument. Mixed brands or different declared counts block it.
  const brands = [
    /\bkalshi\b/i.test(text) ? 'kalshi' : null,
    /\bprize\s*picks\b/i.test(text) ? 'prizepicks' : null,
    /\bdraft\s*kings\b/i.test(text) ? 'draftkings' : null
  ].filter(Boolean);
  const brandConflict = brands.length > 1;
  const isKalshi = !brandConflict &&
    (brands[0] === 'kalshi' ||
      (brands.length === 0 && /\b\d{1,2}\s+markets?\s+combo\b|\bcombo\s*[·•]\s*\d{1,2}\s+markets?\b/i.test(text)));
  const isPrizePicks = brands.length === 1 && brands[0] === 'prizepicks';
  const isDraftKings = brands.length === 1 && brands[0] === 'draftkings';
  const isSgpPlus = /\bsame game parlay\s*\+|\bsgp\s*\+|\bsgp\+/i.test(text);

  const format: ScreenshotTicketFormat = brandConflict ? 'unknown'
    : isKalshi ? 'kalshi_combo'
    : isPrizePicks ? 'prizepicks_lineup'
    : isSgpPlus ? 'draftkings_sgp_plus'
    : 'sportsbook_ticket';

  const pricingKind: ScreenshotPricingKind =
    isKalshi && !brandConflict ? 'prediction_contract_percent'
      : isPrizePicks && !brandConflict ? 'pickem_multiplier'
        : isSgpPlus && !brandConflict ? 'official_sgp_price'
          : format === 'sportsbook_ticket' ? 'american_odds'
            : 'unavailable';

  const counts: number[] = [];
  for (const sourceLine of text.split('\n')) {
    const row = sourceLine.trim();
    const heading = row.match(/^(\d{1,2})\s+markets?\s+combo\b/i)
      ?? row.match(/^(\d{1,2})\s+leg(?:s)?\s+same game parlay\+/i);
    const reverseHeading = row.match(/^combo\s*[·•]\s*(\d{1,2})\s+markets?\b/i);
    const raw = heading?.[1] ?? reverseHeading?.[1];
    const n = raw ? Number(raw) : 0;
    if (n > 0 && n <= 30) counts.push(n);
  }
  const uniqueCounts = Array.from(new Set(counts));
  const declaredLegCount = uniqueCounts.length === 1 ? uniqueCounts[0]! : null;
  const declaredCountConflict = uniqueCounts.length > 1;

  const openLabel = /\bopen position\b/i.test(text);
  const closedLabel = /\bposition closed\b/i.test(text);
  const screenshotState: ScreenshotTicketMetadata['screenshotState'] =
    openLabel && !closedLabel ? 'open_position'
      : closedLabel && !openLabel ? 'closed_position'
        : 'unknown';

  const cost = isKalshi ? labeledMoney(text, /\b(?:cost)\s*[:\n ]*\$([\d,]+(?:\.\d{1,2})?)/i) : null;
  const statedMaxPayout = isKalshi
    ? labeledMoney(text, /\b(?:max payout)\s*[:\n ]*\$([\d,]+(?:\.\d{1,2})?)/i)
    : null;
  const mult = text.match(/\bto\s+win\s+(\d+(?:\.\d+)?)\s*x\b/i);
  const statedMultiplier = mult?.[1] && isKalshi ? Number(mult[1]) : null;
  const sgpOdds = isSgpPlus && !brandConflict
    ? text.match(/\b(?:\d+\s*leg\s*)?same game parlay\+[^\n]*?\s([+-]\d{3,5})\b/i)
    : null;
  const officialCombinedAmericanOdds = sgpOdds?.[1] ?? null;
  const hasHiddenLegs = /\+\s*\d+\s+more markets?\b/i.test(text);

  const warnings: string[] = [];
  if (brandConflict) warnings.push('Multiple sportsbook brands appear in the capture. Separate the tickets before analysis.');
  if (declaredCountConflict) warnings.push('Different ticket sizes appear in one capture. Separate them before analysis.');
  if (hasHiddenLegs) warnings.push('Some selections are hidden behind an expanded-card summary.');
  if (pricingKind === 'prediction_contract_percent') {
    warnings.push('Kalshi contract percentages are displayed prices, not calibrated win probabilities or American odds.');
  }
  if (pricingKind === 'pickem_multiplier') {
    warnings.push('Pick’em projections and multipliers are not conventional sportsbook odds.');
  }
  if (pricingKind === 'official_sgp_price') {
    warnings.push('SGP+ legs require the sportsbook combined price; independent-leg multiplication is invalid.');
  }
  if (screenshotState === 'closed_position') {
    warnings.push('Position closed does not prove a winning outcome or a verified settlement.');
  }
  return {
    format, pricingKind, declaredLegCount, declaredCountConflict, screenshotState,
    cost, statedMaxPayout, statedMultiplier, officialCombinedAmericanOdds,
    hasHiddenLegs, warnings
  };
}

export function screenshotCoverage(metadata: ScreenshotTicketMetadata, candidateLegCount: number): {
  missingCount: number;
  incomplete: boolean;
  note: string | null;
} {
  if (metadata.declaredCountConflict) {
    return { missingCount: 0, incomplete: true, note: 'Conflicting ticket-size headings. Upload a single ticket.' };
  }
  if (metadata.declaredLegCount == null) {
    return {
      missingCount: 0,
      incomplete: metadata.hasHiddenLegs,
      note: metadata.hasHiddenLegs ? 'The screenshot hides additional selections; confirm the entire ticket before analysis.' : null
    };
  }
  const missingCount = Math.max(0, metadata.declaredLegCount - candidateLegCount);
  const excessCount = candidateLegCount > metadata.declaredLegCount;
  return {
    missingCount,
    // Hidden summary rows can be reconciled by another image or manually added legs.
    incomplete: missingCount > 0 || excessCount,
    note: missingCount > 0
      ? 'Only ' + candidateLegCount + ' of ' + metadata.declaredLegCount + ' declared selections are represented. Add the missing legs.'
      : excessCount
        ? 'More selections were recognized than the ticket declares. Check for a second ticket or spurious OCR rows.'
        : null
  };
}
