import { asMarketType, type MarketType } from '@/src/core/markets/marketType';
import type { ParseConfidence, TrackedTicketLeg } from '@/src/core/track/types';
import { inspectScreenshotTicket } from '@/src/core/track/screenshotTicketMetadata';

const MARKET_TOKEN_MAP: Array<{ pattern: RegExp; marketType: MarketType; label: string }> = [
  { pattern: /\b(?:rushing|rush)\s*\+\s*(?:receiving|rec)\s+(?:yards?|yds?)\b/i, marketType: 'rushing_receiving_yards', label: 'Rushing + receiving yards' },
  { pattern: /\b(?:passing|pass)\s+(?:yards?|yds?)\b/i, marketType: 'passing_yards', label: 'Passing yards' },
  { pattern: /\b(?:passing|pass)\s+(?:touchdowns?|tds?)\b/i, marketType: 'passing_tds', label: 'Passing TDs' },
  { pattern: /\b(?:rushing|rush)\s+(?:yards?|yds?)\b/i, marketType: 'rushing_yards', label: 'Rushing yards' },
  { pattern: /\b(?:receiving|rec)\s+(?:yards?|yds?)\b/i, marketType: 'receiving_yards', label: 'Receiving yards' },
  { pattern: /\b(?:receptions?|catches)\b/i, marketType: 'receptions', label: 'Receptions' },
  { pattern: /\b(?:carries|rush(?:ing)?\s+attempts?)\b/i, marketType: 'carries', label: 'Carries' },
  { pattern: /\b(?:any\s*time|anytime)\s+(?:touchdown|td)(?:\s+scorer)?\b|\battd\b|\bto\s+score(?:\s+a)?\s+touchdown\b/i, marketType: 'anytime_td', label: 'Anytime TD' },
  { pattern: /\bmoneyline\b/i, marketType: 'moneyline', label: 'Moneyline' },
  { pattern: /\bpra\b|points\s*\+\s*rebounds\s*\+\s*assists|pts?\s*\+\s*reb\s*\+\s*ast/i, marketType: 'pra', label: 'PRA' },
  { pattern: /\breb(?:ounds?)?\s*\+\s*ast(?:s|sists?)?\b|\b(?:reb|rebs)\+\s*(?:ast|asts)\b/i, marketType: 'ra', label: 'Rebounds + assists' },
  { pattern: /\b3\s*(pt|pointer)|threes?\b/i, marketType: 'threes', label: 'Threes' },
  { pattern: /\bassists?\b/i, marketType: 'assists', label: 'Assists' },
  { pattern: /\brebounds?\b/i, marketType: 'rebounds', label: 'Rebounds' },
  { pattern: /\bpoints?|\bpts?\b/i, marketType: 'points', label: 'Points' },
];

const NFL_MARKETS = new Set<MarketType>([
  'passing_yards',
  'passing_tds',
  'rushing_yards',
  'rushing_receiving_yards',
  'receiving_yards',
  'receptions',
  'carries',
  'anytime_td',
]);

const ALT_DESCRIPTOR = /^(.+?)\s*[-–—]\s*ALT\s+(PASSING|RUSHING|RECEIVING|RUSHING\s*\+\s*RECEIVING)\s+(YDS?|YARDS?|TDS?|TOUCHDOWNS?|ATTEMPTS?|RECEPTIONS?)$/i;
const ALT_RECEPTIONS_DESCRIPTOR = /^(.+?)\s*[-–—]\s*ALT\s+RECEPTIONS?$/i;
const GENERIC_PLUS_PROP = /^(.+?)\s+(\d+(?:\.\d+)?)\+\s+(YARDS?|RECEPTIONS?|CARRIES|PASSING\s+TOUCHDOWNS?)(?:\s+([+-]\d{2,5}))?(?:\s+([A-Z]{2,4}\s*@\s*[A-Z]{2,4}))?$/i;

function sanitizeSportsbookLine(input: string): string {
  const afterBreadcrumb = input.includes('>') ? input.split('>').at(-1) ?? input : input;
  return afterBreadcrumb
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/^\d+\s+(?=[A-Z][A-Za-z'.-]+\s+[A-Z])/, '')
    .replace(/^Te\s+(?=[A-Z][A-Za-z'.-]+\s+[A-Z])/, '')
    .replace(/\[[A-Za-z0-9]+\b/g, '')
    .replace(/[©®]+/g, ' ')
    .replace(/[&)\]]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalMarket(input: string): { marketType: MarketType; marketLabel: string; inferred: boolean } {
  for (const token of MARKET_TOKEN_MAP) {
    if (token.pattern.test(input)) {
      return { marketType: token.marketType, marketLabel: token.label, inferred: false };
    }
  }
  return { marketType: asMarketType(undefined, 'points'), marketLabel: 'Needs review', inferred: true };
}

function normalizePlayerName(input: string): string {
  return input
    .replace(/[|*_~`]+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .replace(/[+-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparablePlayer(input: string): string {
  return normalizePlayerName(input)
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '');
}

function samePlayer(left: string, right: string): boolean {
  const a = comparablePlayer(left);
  const b = comparablePlayer(right);
  return a === b || (Math.min(a.length, b.length) >= 6 && (a.startsWith(b) || b.startsWith(a)));
}

function descriptorMarket(line: string): { player: string; market: string } | null {
  const receptions = line.match(ALT_RECEPTIONS_DESCRIPTOR);
  if (receptions?.[1]) {
    return { player: normalizePlayerName(receptions[1]), market: 'receptions' };
  }
  const match = line.match(ALT_DESCRIPTOR);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const family = match[2].toLowerCase();
  const unit = match[3].toLowerCase();
  let market = `${family.replace(/\s*\+\s*/g, ' + ')} yards`;
  if (unit.startsWith('td') || unit.startsWith('touchdown')) market = 'passing touchdowns';
  else if (unit.startsWith('attempt')) market = 'carries';
  else if (unit.startsWith('reception')) market = 'receptions';
  return { player: normalizePlayerName(match[1]), market };
}

// Merge only adjacent recognizable split-row OCR fragments.
function isStandalonePlayer(row: string): boolean {
  if (!/^[A-Z][A-Za-z'.-]+(?:\s+(?:[A-Z][A-Za-z'.-]+|II|III|IV)){1,3}$/.test(row)) return false;
  if (/\b(?:sportsbook|parlay|draftkings|fanduel|prizepicks|my bets|open|settled|cash out|payout|game total|same game|total wager|total return|your bets|bet slip)\b/i.test(row)) return false;
  return true;
}
function isDirectionalMarketRow(row: string): boolean {
  return /^(?:(?:over|under)\s+\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*\+)\s+/i.test(row) &&
    !canonicalMarket(row).inferred;
}
function isIsolatedOdds(row: string): boolean {
  return /^[+-]\d{3,5}$/.test(row);
}

function coalesceSportsbookFragments(lines: string[]): string[] {
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const current = sanitizeSportsbookLine(lines[index]!);
    const following = index + 1 < lines.length ? sanitizeSportsbookLine(lines[index + 1]!) : '';
    if (isStandalonePlayer(current) && isDirectionalMarketRow(following)) {
      const third = index + 2 < lines.length ? lines[index + 2]!.trim() : '';
      const standaloneOdds = isIsolatedOdds(third) ? ' ' + third : '';
      output.push(current + ' ' + following + standaloneOdds);
      index += standaloneOdds ? 2 : 1;
      continue;
    }
    // DraftKings often puts MONEYLINE and PRA ladder targets on their own row.
    if (isStandalonePlayer(current) && /^moneyline$/i.test(following)) {
      output.push(current + ' moneyline');
      index += 1;
      continue;
    }
    const main = current.match(GENERIC_PLUS_PROP);
    let descriptor: ReturnType<typeof descriptorMarket> = null;
    let descriptorEnd = index;

    if (main) {
      for (let end = index + 1; end <= Math.min(index + 3, lines.length - 1); end += 1) {
        const joined = lines
          .slice(index + 1, end + 1)
          .map(sanitizeSportsbookLine)
          .join(' ');
        const candidate = descriptorMarket(joined);
        if (candidate && main[1] && samePlayer(main[1], candidate.player)) {
          descriptor = candidate;
          descriptorEnd = end;
          break;
        }
      }
    }

    if (main?.[1] && main[2] && descriptor) {
      const player = normalizePlayerName(main[1]);
      const threshold = main[2];
      const odds = main[4] ? ` ${main[4]}` : '';
      const teams = main[5] ? ` ${main[5]}` : '';
      output.push(`${player} over ${threshold} ${descriptor.market}${odds}${teams}`);
      index = descriptorEnd;
      continue;
    }

    output.push(current);
  }
  return output;
}

function parseDirection(input: string): 'over' | 'under' {
  if (/\bunder\b/i.test(input)) return 'under';
  return 'over';
}

function parseThreshold(input: string): { threshold?: number; ladder: boolean } {
  const plus = input.match(/(\d+(?:\.\d+)?)\s*\+/i);
  if (plus) return { threshold: Number(plus[1]), ladder: true };

  const decimal = input.match(/\b(over|under)\s*(\d+(?:\.\d+)?)/i) ?? input.match(/\b(\d+(?:\.\d+)?)\b/);
  if (decimal) return { threshold: Number(decimal[2] ?? decimal[1]), ladder: false };

  return { threshold: undefined, ladder: false };
}

function parseOdds(input: string): string | undefined {
  const odds = input.match(/(^|\s)([+-]\d{2,5})(?=\s|$)/);
  return odds?.[2];
}

function parseTeams(input: string): { teams?: string; gameId?: string } {
  const atMatch = input.match(/\b([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\b/);
  if (atMatch?.[1] && atMatch?.[2]) {
    return { teams: `${atMatch[1]} @ ${atMatch[2]}`, gameId: `${atMatch[1]}@${atMatch[2]}` };
  }

  const vsMatch = input.match(/\b([A-Z]{2,4})\s*(?:vs\.?|v\.?|-)\s*([A-Z]{2,4})\b/i);
  if (vsMatch?.[1] && vsMatch?.[2]) {
    const home = vsMatch[1].toUpperCase();
    const away = vsMatch[2].toUpperCase();
    return { teams: `${home} @ ${away}`, gameId: `${home}@${away}` };
  }

  return {};
}

function inferPlayer(input: string): string {
  const stripped = input
    .replace(/(^|\s)[+-]\d{2,5}\b/g, ' ')
    .replace(/\b(OVER|UNDER)\b.*$/i, '')
    .replace(/\bTO\s+(SCORE|RECORD)\b.*$/i, '')
    .replace(/\b\d+(?:\.\d+)?\+?\b/g, '')
    .replace(/\b(POINTS?|PTS?|ASSISTS?|ASTS?|REBOUNDS?|REBS?|PRA|THREES?|MONEYLINE|PASS(?:ING)?\s+(?:YARDS?|YDS?|TDS?|TOUCHDOWNS?)|RUSH(?:ING)?\s+(?:YARDS?|YDS?|ATTEMPTS?)|RECEIV(?:ING)?\s+(?:YARDS?|YDS?)|REC\s+(?:YARDS?|YDS?)|RECEPTIONS?|CATCHES|CARRIES|ANYTIME\s+(?:TD|TOUCHDOWN))\b/gi, '')
    .replace(/\bALT\b/gi, '')
    .replace(/\b([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\b/g, '')
    .replace(/\s*\+\s*/g, ' ')
    .trim();

  const cleaned = normalizePlayerName(stripped);
  if (cleaned.length > 1) return cleaned;

  const prefix = input.split(/\s+(OVER|UNDER|TO)\b/i)[0] ?? '';
  return normalizePlayerName(prefix) || 'Needs review';
}

function confidenceFor(input: { player: string; inferredMarket: boolean; threshold?: number; unresolved: boolean }): ParseConfidence {
  if (input.unresolved || input.player === 'Needs review') return 'low';
  if (input.threshold == null) return 'low';
  if (input.inferredMarket) return 'medium';
  return 'high';
}

function nonEmptyLines(rawText: string): string[] {
  return rawText.split('\n').map((line) => line.trim()).filter(Boolean);
}

function looksLikeCandidateLeg(line: string): boolean {
  if (/^\d{1,2}\s+leg\s+same game parlay\+|\bmarkets?\s+combo\b|^combo\s*[·•]|^\+\d+\s+more markets?\b/i.test(line)) return false;
  if (!canonicalMarket(line).inferred) return true;
  if (/\b(over|under)\s+\d+(?:\.\d+)?\b/i.test(line)) return true;
  if (/\b\d+(?:\.\d+)?\+\s+(?:yards?|receptions?|carries|passing\s+touchdowns?)\b/i.test(line)) return true;

  const americanOdds = /(^|\s)[+-]\d{2,5}\b/.test(line);
  const withoutOdds = line.replace(/(^|\s)[+-]\d{2,5}\b/g, ' ');
  if (americanOdds && /\d+(?:\.\d+)?/.test(withoutOdds) && /[A-Za-z]{3}/.test(withoutOdds)) return true;
  return false;
}

function unresolvedFallback(rawText: string, sourceHint: string): TrackedTicketLeg[] {
  return [{
    legId: 'leg-1',
    league: 'Unknown',
    player: 'Needs review',
    rawPlayer: '',
    marketType: 'points',
    marketLabel: 'Needs review',
    threshold: 0,
    direction: 'over',
    source: sourceHint,
    parseConfidence: 'low',
    needsReview: true,
    rawText: rawText.trim() || 'Unparsed leg',
  }];
}

/**
 * Kalshi's displayed percentages represent contract quotes, not conventional
 * American odds. Return review-only candidates with quotedContractPercent,
 * never an invented implied probability or a synthetic betting payout.
 */
function parseKalshiCandidates(rawLines: string[], sourceHint: string): TrackedTicketLeg[] {
  const candidates: TrackedTicketLeg[] = [];
  let league = 'Unknown';
  let matchup: string | undefined;
  for (const raw of rawLines) {
    const row = raw.replace(/\s+/g, ' ').trim();
    if (/^(?:NCAA Football|College Football|CFB)$/i.test(row)) { league = 'NCAAF'; matchup = undefined; continue; }
    if (/^NBA$/i.test(row)) { league = 'NBA'; matchup = undefined; continue; }
    if (/^NHL$/i.test(row)) { league = 'NHL'; matchup = undefined; continue; }
    if (/^NFL$/i.test(row)) { league = 'NFL'; matchup = undefined; continue; }
    if (/^(?:NCAA Basketball|College Basketball)$/i.test(row)) { league = 'NCAAB'; matchup = undefined; continue; }
    if (/\b(?:at|vs\.?|versus)\b/i.test(row) && !/\bto win\b|\bpoints\b/i.test(row) &&
        row.length >= 8 && row.length <= 100) {
      matchup = row;
      continue;
    }
    const contractNo = row.match(/^(?:no\s*[·:–-]\s*)?(.+?)\s+(win by over)\s+(\d+(?:\.\d+)?)\s+points(?:\s+(\d{1,3})\s*%)?$/i);
    if (contractNo && /^no\b/i.test(row)) {
      candidates.push({
        legId: 'leg-' + (candidates.length + 1), league, player: contractNo[1]!,
        rawPlayer: contractNo[1]!, marketType: 'spread',
        marketLabel: 'No on proposition: win by over ' + contractNo[3] + ' points',
        threshold: Number(contractNo[3]), thresholdObserved: true,
        direction: 'over', directionObserved: false,
        contractSide: 'no', unsupportedMarket: true,
        quotedContractPercent: contractNo[4] ? Number(contractNo[4]) : undefined,
        odds: undefined, source: sourceHint, parseConfidence: 'low',
        needsReview: true, rawText: row, teams: matchup
      });
      continue;
    }
    const win = row.match(/^(.+?)\s+to\s+win(?:\s+(\d{1,3})\s*%)?$/i);
    if (win && !/^(?:cost|max payout|cash|open|position)/i.test(win[1]!)) {
      candidates.push({
        legId: 'leg-' + (candidates.length + 1), league,
        player: win[1]!, rawPlayer: win[1]!,
        marketType: 'moneyline', marketLabel: 'Moneyline (contract: YES)',
        threshold: 0, thresholdObserved: true, direction: 'over',
        directionObserved: true, contractSide: 'yes',
        quotedContractPercent: win[2] ? Number(win[2]) : undefined,
        source: sourceHint, parseConfidence: 'medium', needsReview: true,
        rawText: row, teams: matchup
      });
      continue;
    }
    const prop = row.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*\+\s+(threes?|pts?|points?|assists?|rebounds?|pra|touchdowns?|reb\s*\+\s*asts?)(?:\s+(\d{1,3})\s*%)?$/i);
    if (prop) {
      const touchdownContract = /^touchdowns?$/i.test(prop[3]!);
      const market = touchdownContract
        ? { marketType: 'anytime_td' as MarketType, marketLabel: 'Touchdowns: ' + prop[2] + '+ (special contract)', inferred: false }
        : canonicalMarket(prop[3]!);
      candidates.push({
        legId: 'leg-' + (candidates.length + 1), league,
        player: prop[1]!, rawPlayer: prop[1]!,
        marketType: market.marketType, marketLabel: market.marketLabel,
        unsupportedMarket: touchdownContract,
        threshold: Number(prop[2]), thresholdObserved: true,
        direction: 'over', directionObserved: true, contractSide: 'yes',
        quotedContractPercent: prop[4] ? Number(prop[4]) : undefined,
        source: sourceHint, parseConfidence: touchdownContract ? 'low' : 'medium', needsReview: true,
        rawText: row, teams: matchup
      });
    }
  }
  return candidates;
}

/**
 * PrizePicks "fantasy score" and special pick'em projections are not
 * silently coerced into points or conventional American odds.
 */
function parsePrizePicksCandidates(rawLines: string[], sourceHint: string): TrackedTicketLeg[] {
  const candidates: TrackedTicketLeg[] = [];
  let league = 'Unknown';
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index]!.replace(/\s+/g, ' ').trim();
    if (/^NBA$/i.test(raw)) { league = 'NBA'; continue; }
    if (/^(?:CFB|NCAAF)$/i.test(raw)) { league = 'NCAAF'; continue; }
    const direct = raw.match(/^(.+?)\s+(?:↑|⬆|more|over)\s*(\d+(?:\.\d+)?)\s+(.+)$/i);
    const candidatePlayer = isStandalonePlayer(raw) ? raw : null;
    let next = '';
    let split: RegExpMatchArray | null = null;
    let consumed = 0;
    if (candidatePlayer) {
      for (let offset = 1; offset <= 3 && index + offset < rawLines.length; offset += 1) {
        const row = rawLines[index + offset]!.replace(/\s+/g, ' ').trim();
        if (/^(?:↑|⬆|more|over)\s*\d+(?:\.\d+)?\s+.+/i.test(row)) {
          next = row;
          split = row.match(/^(?:↑|⬆|more|over)\s*(\d+(?:\.\d+)?)\s+(.+)$/i);
          consumed = offset;
          break;
        }
        const standaloneNumber = row.match(/^(?:↑|⬆|more|over)\s*(\d+(?:\.\d+)?)$/i);
        if (standaloneNumber && index + offset + 1 < rawLines.length) {
          const nextMarket = rawLines[index + offset + 1]!.trim();
          if (/^(?:fantasy score|reb(?:ounds?)?\s*\+\s*ast(?:s|sists?)?|pra|points?|threes?|assists?)$/i.test(nextMarket)) {
            next = row + ' ' + nextMarket;
            split = next.match(/^(?:↑|⬆|more|over)\s*(\d+(?:\.\d+)?)\s+(.+)$/i);
            consumed = offset + 1;
            break;
          }
        }
        if (/^(?:NBA|CFB|NCAAF|NFL|NHL)$/i.test(row)) break;
        if (!/^[A-Z0-9#.\s-]{1,28}$/i.test(row)) break;
      }
    }
    const player = direct?.[1] ?? (split ? candidatePlayer : null);
    const line = direct?.[2] ?? split?.[1];
    const marketRaw = direct?.[3] ?? split?.[2];
    if (!player || !line || !marketRaw) continue;
    const market = canonicalMarket(marketRaw);
    const unsupported = /fantasy\s*score/i.test(marketRaw) || market.inferred;
    candidates.push({
      legId: 'leg-' + (candidates.length + 1), league, player, rawPlayer: player,
      marketType: market.marketType,
      marketLabel: unsupported ? 'Unsupported pick’em market: ' + marketRaw : market.marketLabel,
      unsupportedMarket: unsupported, threshold: Number(line),
      thresholdObserved: true, direction: 'over', directionObserved: true,
      source: sourceHint, parseConfidence: unsupported ? 'low' : 'medium',
      needsReview: true, rawText: direct ? raw : raw + ' ' + next
    });
    if (split) index += consumed;
  }
  return candidates;
}

export function parseSlipTextToLegs(rawText: string, sourceHint: string): TrackedTicketLeg[] {
  const rawLines = nonEmptyLines(rawText);
  if (rawLines.length === 0) return unresolvedFallback(rawText, sourceHint);
  const ticketFormat = inspectScreenshotTicket(rawText).format;
  if (ticketFormat === 'kalshi_combo') {
    const legs = parseKalshiCandidates(rawLines, sourceHint);
    return legs.length ? legs : unresolvedFallback(rawText, sourceHint);
  }
  if (ticketFormat === 'prizepicks_lineup') {
    const legs = parsePrizePicksCandidates(rawLines, sourceHint);
    return legs.length ? legs : unresolvedFallback(rawText, sourceHint);
  }

  const leagueHeaders = new Set(
    rawLines.filter((row) => /^(?:NFL|NBA)$/i.test(row.trim()))
      .map((row) => row.trim().toUpperCase())
  );
  const uniqueHeaderLeague = leagueHeaders.size === 1 ? [...leagueHeaders][0] : undefined;
  const rows = coalesceSportsbookFragments(rawLines);
  let sgpEvent: string | undefined;
  const candidates: Array<{ line: string; event?: string }> = [];
  for (const row of rows) {
    // Retain the actual visible SGP+ matchup, not an inferred event identity.
    // This context is screenshot-derived and still requires confirmation.
    if (ticketFormat === 'draftkings_sgp_plus' &&
      /^.{3,70}\s+@\s+.{3,70}$/.test(row) && !looksLikeCandidateLeg(row)) {
      sgpEvent = row;
    }
    if (looksLikeCandidateLeg(row)) {
      candidates.push({ line: row, event: sgpEvent });
    }
  }
  if (candidates.length === 0) return unresolvedFallback(rawText, sourceHint);

  return candidates.map(({ line, event }, index) => {
    const { marketType, marketLabel, inferred } = canonicalMarket(line);
    const direction = parseDirection(line);
    const parsedThreshold = marketType === 'anytime_td'
      ? { threshold: 1, ladder: false }
      : parseThreshold(line);
    const odds = parseOdds(line);
    const player = inferPlayer(line);
    const teamDetails = parseTeams(line);
    const unresolved = parsedThreshold.threshold == null || marketLabel === 'Needs review';
    const parseConfidence = confidenceFor({
      player,
      inferredMarket: inferred,
      threshold: parsedThreshold.threshold,
      unresolved,
    });
    const league = /\bNFL\b/i.test(line) ? 'NFL' : /\bNBA\b/i.test(line) ? 'NBA'
      : NFL_MARKETS.has(marketType) ? 'NFL' : uniqueHeaderLeague ?? 'Unknown';
    const directionObserved = marketType === 'anytime_td' ||
      /\b(?:over|under)\b|\d+(?:\.\d+)?\s*\+/i.test(line);
    const thresholdObserved = parsedThreshold.threshold != null;
    const requiresReview = league === 'Unknown' || parseConfidence === 'low' ||
      !directionObserved || !thresholdObserved;

    return {
      legId: `leg-${index + 1}`,
      league,
      player,
      rawPlayer: player,
      marketType,
      marketLabel,
      threshold: parsedThreshold.threshold ?? 0,
      direction,
      directionObserved,
      thresholdObserved,
      odds,
      source: sourceHint,
      parseConfidence,
      needsReview: requiresReview,
      rawText: line,
      ladder: parsedThreshold.ladder,
      teams: teamDetails.teams ?? event,
      gameId: teamDetails.gameId ?? (event ? 'screenshot:' + event.toLowerCase().replace(/\s+/g, ' ').trim() : undefined),
    };
  });
}
