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
  | 'same_game_parlay'
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
  displayedPotentialReturn?: number | null;
  closedPositionObservations?: Array<{ declaredLegCount: number; displayedAmount: number | null }>;
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
    /\bdraft\s*kings\b/i.test(text) ? 'draftkings' : null,
    /\bfan\s*duel\b/i.test(text) ? 'fanduel' : null
  ].filter(Boolean);
  const brandConflict = brands.length > 1;
  const quotedWinContracts = (text.match(/\bto\s+win\s+\d{1,3}\s*%(?!\w)/gi) ?? []).length;
  const isKalshi = !brandConflict &&
    (brands[0] === 'kalshi' ||
      (brands.length === 0 && (
        /\b\d{1,2}\s+markets?\s+combo\b|\bcombo\s*[·•]\s*\d{1,2}\s+markets?\b/i.test(text) ||
        quotedWinContracts >= 2
      )));
  const layoutSuggestsPickem = /(?:↑|⬆)\s*\d+(?:\.\d+)?\s*(?:fantasy\s*score|reb\s*\+\s*asts?|pra)\b/i.test(text);
  const isPrizePicks = !brandConflict &&
    (brands[0] === 'prizepicks' || (brands.length === 0 && layoutSuggestsPickem));
  const isSgpPlus = /\bsame game parlay\s*\+|\bsgp\s*\+/i.test(text);
  const isSgp = isSgpPlus || /^(?:\d{1,2}(?:\s+|-)legs?\s+)?(?:same game parlay|sgp)(?=\s|$)/im.test(text);

  const format: ScreenshotTicketFormat = brandConflict ? 'unknown'
    : isKalshi ? 'kalshi_combo'
    : isPrizePicks ? 'prizepicks_lineup'
    : isSgpPlus ? 'draftkings_sgp_plus'
    : isSgp ? 'same_game_parlay'
    : 'sportsbook_ticket';

  const pricingKind: ScreenshotPricingKind =
    isKalshi && !brandConflict ? 'prediction_contract_percent'
      : isPrizePicks && !brandConflict ? 'pickem_multiplier'
        : isSgp && !brandConflict ? 'official_sgp_price'
          : format === 'sportsbook_ticket' ? 'american_odds'
            : 'unavailable';

  const rows = text.split('\n').map((row) => row.trim());
  const headings = rows.flatMap((row, index) => {
    const match = row.match(/^(\d{1,2})\s+markets?\s+combo\b/i)
      ?? row.match(/^combo\s*[·•]\s*(\d{1,2})\s+markets?\b/i)
      ?? row.match(/^(\d{1,2})(?:\s+|-)legs?\s+(?:same game parlay|sgp|parlay)(?=\s|\+|$)/i);
    const count = Number(match?.[1]);
    return count > 0 && count <= 30 ? [{ count, index, text: row }] : [];
  });
  const openLabel = /\bopen positions?\b/i.test(text);
  const closedLabel = /\b(?:positions? closed|closed positions?)\b|^closed$/im.test(text);
  const screenshotState: ScreenshotTicketMetadata['screenshotState'] =
    openLabel && !closedLabel ? 'open_position'
      : closedLabel && !openLabel ? 'closed_position'
        : 'unknown';

  const closedPositionObservations = isKalshi && screenshotState === 'closed_position'
    ? headings.map(({ count, index, text: heading }, positionIndex) => {
      const following = rows.slice(index + 1, headings[positionIndex + 1]?.index).join('\n');
      const amount = heading.match(/\$([\d,]+(?:\.\d{1,2})?)\s*$/)?.[1]
        ?? following.match(/^\$([\d,]+(?:\.\d{1,2})?)\s*$/m)?.[1];
      return { declaredLegCount: count, displayedAmount: dollars(amount) };
    })
    : [];
  const declaredCountConflict = brandConflict || new Set(headings.map(({ count }) => count)).size > 1 ||
    closedPositionObservations.length > 1;
  const declaredLegCount = declaredCountConflict ? null : headings[0]?.count ?? null;

  const cost = isKalshi && !declaredCountConflict
    ? labeledMoney(text, /\bcost\s*[:\n ]*\$([\d,]+(?:\.\d{1,2})?)/i)
    : null;
  const statedMaxPayout = isKalshi && !declaredCountConflict
    ? labeledMoney(text, /\bmax(?:imum)? payout\s*[:\n ]*\$([\d,]+(?:\.\d{1,2})?)/i)
    : null;
  const mult = text.match(/\b(?:to\s+win|(?:displayed\s+)?multiplier)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:x\b|×)/i);
  const statedMultiplier = mult?.[1] && isKalshi && !declaredCountConflict ? Number(mult[1]) : null;
  const displayedPotentialReturn = isKalshi && screenshotState !== 'closed_position' && !declaredCountConflict
    ? labeledMoney(text, /\b(?:to\s+win|potential\s+return)\s*:?\s*(?:\d+(?:\.\d+)?\s*(?:x\b|×)\s*)?\$([\d,]+(?:\.\d{1,2})?)/i)
      ?? (statedMultiplier == null ? null : labeledMoney(text, /^\s*(?:displayed amount)\s*:?\s*\$([\d,]+(?:\.\d{1,2})?)/im))
    : null;
  const headline = rows.find((row) => /^(?:\d{1,2}(?:\s+|-)legs?\s+)?(?:same game parlay|sgp)\s*\+?\s+[+-]\d{3,5}\s*$/i.test(row));
  const officialCombinedAmericanOdds = isSgp && !declaredCountConflict
    ? headline?.match(/([+-]\d{3,5})\s*$/)?.[1]
      ?? text.match(/^\s*(?:official\s+)?combined odds\s*:?\s*([+-]\d{3,5})\s*$/im)?.[1]
      ?? null
    : null;
  const hasHiddenLegs = /\+\s*\d+\s+more markets?\b/i.test(text);

  const warnings: string[] = [];
  if (brandConflict) warnings.push('Multiple sportsbook brands appear in the capture. Separate the tickets before analysis.');
  if (isPrizePicks && brands.length === 0) warnings.push('Layout resembles a pick’em slip, but the provider brand is not visible or verified.');
  if (isKalshi && brands.length === 0) warnings.push('Layout resembles a Kalshi-style prediction combo; the provider brand is not independently verified.');
  if (declaredCountConflict && !brandConflict) warnings.push('Multiple ticket headings appear in one capture. Separate the tickets before analysis.');
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
    cost, statedMaxPayout, statedMultiplier, displayedPotentialReturn, closedPositionObservations, officialCombinedAmericanOdds,
    hasHiddenLegs, warnings
  };
}

export function screenshotCoverage(metadata: ScreenshotTicketMetadata, candidateLegCount: number): {
  missingCount: number;
  incomplete: boolean;
  note: string | null;
} {
  if (metadata.declaredCountConflict) {
    return { missingCount: 0, incomplete: true, note: 'Multiple tickets may be present. Upload one ticket at a time.' };
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
      ? candidateLegCount + ' of ' + metadata.declaredLegCount + ' selections recognized. ' + missingCount + (missingCount === 1 ? ' selection still needs review.' : ' selections still need review.')
      : excessCount
        ? 'More selections were recognized than the ticket declares. Check for a second ticket or spurious OCR rows.'
        : null
  };
}
