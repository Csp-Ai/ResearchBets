import type { TrackedTicketLeg } from '@/src/core/track/types';
import {
  screenshotCoverage,
  type ScreenshotTicketMetadata
} from '@/src/core/track/screenshotTicketMetadata';

/**
 * Screenshot completeness preflight, not a separate risk/prediction engine.
 * All user-visible claims are derived only from OCR observations and
 * declared ticket counts. Evidence-based sports X-Ray remains canonical.
 */
export type ScreenshotPreflight = {
  title: string;
  read: string;
  primaryPressure: string;
  nextAction: string;
  readyForCanonicalXRay: boolean;
};

export function summarizeScreenshotPreflight(
  metadata: ScreenshotTicketMetadata,
  legs: TrackedTicketLeg[]
): ScreenshotPreflight {
  const count = legs.length;
  const declared = metadata.declaredLegCount;
  const coverage = screenshotCoverage(metadata, count);
  const title = declared != null ? count + ' of ' + declared + ' visible selections'
    : count + ' recognized selection' + (count === 1 ? '' : 's');

  if (coverage.incomplete) {
    return {
      title,
      read: 'ResearchBets has only a partial or conflicting view of the ticket. It cannot assess the full combined construction.',
      primaryPressure: coverage.note ?? 'One or more selections remain unavailable.',
      nextAction: 'Expand the ticket, upload the remaining screenshot(s), or enter missing selections manually.',
      readyForCanonicalXRay: false
    };
  }

  if (legs.some(leg => leg.unsupportedMarket)) {
    return {
      title,
      read: 'The screenshot contains a market whose contract terms are not supported by the standard prop analyzer.',
      primaryPressure: 'A projection or NO-side proposition could be misinterpreted as a different market.',
      nextAction: 'Review the exact provider contract wording. Do not convert it into points or an Over/Under assumption.',
      readyForCanonicalXRay: false
    };
  }

  if (metadata.screenshotState === 'closed_position') {
    return {
      title,
      read: 'The image appears to show a closed position. Closed is not the same as won or settled at a verified amount.',
      primaryPressure: 'Outcome verification is missing; displayed checks and percentages are not complete settlement evidence.',
      nextAction: 'Review the official results and any payout before sending this ticket to bettor memory.',
      readyForCanonicalXRay: false
    };
  }

  if (metadata.pricingKind !== 'american_odds') {
    const reason = metadata.pricingKind === 'prediction_contract_percent'
      ? 'Prediction-contract percentages are quotes, not American prices or independent calibrated probabilities.'
      : metadata.pricingKind === 'official_sgp_price'
        ? 'SGP+ cannot be priced by multiplying individual selections; the official combined price and terms are required.'
        : metadata.pricingKind === 'pickem_multiplier'
          ? 'Pick’em payout structures and special selections are not conventional sportsbook parlay odds.'
          : 'The screenshot does not establish a valid conventional pricing model.';
    return {
      title,
      read: 'Visible selections can be reviewed, but the pricing contract requires provider-specific verification.',
      primaryPressure: reason,
      nextAction: 'Confirm ticket structure, market terms and the original official price; use research-only review until the adapter is verified.',
      readyForCanonicalXRay: false
    };
  }

  const missingOdds = legs.filter(leg => !leg.odds).length;
  return {
    title,
    read: 'The visible structure is recognized. User confirmation and live market checks are still required.',
    primaryPressure: missingOdds
      ? missingOdds + ' selection' + (missingOdds === 1 ? ' lacks' : 's lack') + ' a readable original American price.'
      : 'OCR text alone cannot establish that the selections are current, available or favorable.',
    nextAction: missingOdds
      ? 'Confirm missing screenshot prices or continue with explicitly unavailable pricing.'
      : 'Confirm each leg and open canonical Ticket X-Ray for source-backed research.',
    readyForCanonicalXRay: true
  };
}
