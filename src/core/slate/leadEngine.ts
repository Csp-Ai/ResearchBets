import type { MarketType } from '@/src/core/markets/marketType';

import type { SlateSummary } from './slateEngine';

export type BoardProp = {
  id: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: 'stable' | 'watch';
  gameId: string;
};

export type RankedLead = {
  prop: BoardProp;
  convictionScore: number;
  volatility: 'low' | 'medium' | 'high';
  scriptFit: 'strong' | 'neutral' | 'fragile';
  reasoning: string;
  tags: string[];
};

export type LeadOptions = {
  maxLeads: number;
  diversifyAcrossGames: boolean;
  maxPerGame: number;
  minConviction?: number;
  reactive?: { isReactive: boolean };
};

const DEFAULT_OPTIONS: LeadOptions = {
  maxLeads: 8,
  diversifyAcrossGames: true,
  maxPerGame: 2,
  reactive: { isReactive: false }
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const parseLineValue = (line: string) => {
  const match = line.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  return Math.abs(Number(match[0]));
};

function volatilityClass(market: MarketType, line: string): RankedLead['volatility'] {
  const lineValue = parseLineValue(line);
  if (market === 'threes' || (market === 'points' && lineValue >= 26) || (market === 'pra' && lineValue >= 34)) return 'high';
  if (market === 'assists' || market === 'points' || market === 'pra' || market === 'ra') return 'medium';
  if (market === 'rebounds' && lineValue <= 8.5) return 'low';
  return 'medium';
}

function scriptFitForProp(prop: BoardProp, slate: SlateSummary): RankedLead['scriptFit'] {
  const market = prop.market;
  const highVolPoints = market === 'threes' || market === 'points' || market === 'pra';
  const flag3ptVariance = slate.volatilityFlags.some((flag) => flag.toLowerCase().includes('3pt variance'));

  let score = 0;
  if (slate.bias.scoring === 'unders' && highVolPoints) score -= 2;
  if (slate.bias.pace === 'elevated' && (market === 'assists' || market === 'points')) score += 2;
  if (flag3ptVariance && market === 'threes') score -= 2;
  if (prop.riskTag === 'stable') score += 1;

  if (score >= 2) return 'strong';
  if (score <= -1) return 'fragile';
  return 'neutral';
}

function riskScore(prop: BoardProp, volatility: RankedLead['volatility']) {
  const riskTagPenalty = prop.riskTag === 'stable' ? 6 : 14;
  const hitRatePenalty = clamp((70 - prop.hitRateL10) * 0.8, 0, 24);
  const volatilityPenalty = volatility === 'high' ? 15 : volatility === 'medium' ? 8 : 3;
  return riskTagPenalty + hitRatePenalty + volatilityPenalty;
}

function convictionForProp(prop: BoardProp, slate: SlateSummary, reactive: boolean) {
  const volatility = volatilityClass(prop.market, prop.line);
  const scriptFit = scriptFitForProp(prop, slate);
  const base = clamp(prop.hitRateL10, 0, 100);
  const fitBonus = scriptFit === 'strong' ? 8 : scriptFit === 'fragile' ? -8 : 0;
  const reactivePenalty = reactive && volatility === 'high' ? 10 : reactive && volatility === 'medium' ? 4 : 0;
  const convictionScore = clamp(Math.round(base - riskScore(prop, volatility) + fitBonus - reactivePenalty + 18), 0, 100);
  return { convictionScore, volatility, scriptFit };
}

function buildReasoning(prop: BoardProp, slate: SlateSummary, scriptFit: RankedLead['scriptFit'], volatility: RankedLead['volatility']) {
  const scriptBits = [
    slate.bias.pace === 'elevated' ? 'tight spreads and pace keep usage live' : 'slower scripts reduce possession spikes',
    slate.bias.scoring === 'unders' ? 'unders pockets keep ladder shots in check' : 'scoring tone supports steady volume',
    slate.volatilityFlags.some((flag) => flag.toLowerCase().includes('3pt variance')) ? '3PT variance is elevated tonight' : 'perimeter variance is manageable'
  ];

  const fitLine = scriptFit === 'strong'
    ? `${prop.player} profiles as a script fit with role stability that should survive most game scripts.`
    : scriptFit === 'fragile'
      ? `${prop.player} is viable, but this leg needs cleaner script conditions than the slate is currently signaling.`
      : `${prop.player} is a balanced lead that stays playable without forcing a ceiling-only game script.`;

  return `${fitLine} ${scriptBits[0]}; ${scriptBits[1]}, and ${scriptBits[2]} so keep ${volatility}-volatility exposure measured.`;
}

function buildTags(prop: BoardProp, scriptFit: RankedLead['scriptFit'], volatility: RankedLead['volatility'], slate: SlateSummary): string[] {
  const tags = new Set<string>();
  if (prop.riskTag === 'stable') tags.add('role-stable');
  if (scriptFit === 'strong') tags.add('pace-fit');
  if (scriptFit === 'fragile') tags.add('script-fragile');
  if (volatility === 'high') tags.add('variance-watch');
  if (volatility !== 'high') tags.add('variance-avoid');
  if (slate.bias.pace === 'elevated') tags.add('close-game');
  if (slate.bias.scoring === 'unders') tags.add('unders-pocket');
  return Array.from(tags).slice(0, 4);
}

function pickDiversified(ranked: RankedLead[], maxLeads: number, baseCap: number, relaxedCap: number) {
  const selected: RankedLead[] = [];
  const counts = new Map<string, number>();

  const pickWithCap = (cap: number) => {
    for (const lead of ranked) {
      if (selected.length >= maxLeads) return;
      if (selected.some((item) => item.prop.id === lead.prop.id)) continue;
      const current = counts.get(lead.prop.gameId) ?? 0;
      if (current >= cap) continue;
      selected.push(lead);
      counts.set(lead.prop.gameId, current + 1);
    }
  };

  pickWithCap(baseCap);
  if (selected.length < maxLeads) pickWithCap(relaxedCap);

  return selected;
}

export function generateRankedLeads(board: BoardProp[], slate: SlateSummary, opts?: Partial<LeadOptions>): RankedLead[] {
  const options: LeadOptions = {
    ...DEFAULT_OPTIONS,
    ...opts,
    reactive: opts?.reactive ?? DEFAULT_OPTIONS.reactive
  };
  const reactive = Boolean(options.reactive?.isReactive);
  const initialCap = reactive ? 1 : options.maxPerGame;

  const scored = board
    .map((prop) => {
      const { convictionScore, volatility, scriptFit } = convictionForProp(prop, slate, reactive);
      return {
        prop,
        convictionScore,
        volatility,
        scriptFit,
        reasoning: buildReasoning(prop, slate, scriptFit, volatility),
        tags: buildTags(prop, scriptFit, volatility, slate)
      } satisfies RankedLead;
    })
    .filter((lead) => options.minConviction === undefined || lead.convictionScore >= options.minConviction)
    .sort((a, b) => (b.convictionScore - a.convictionScore) || a.prop.player.localeCompare(b.prop.player) || a.prop.id.localeCompare(b.prop.id));

  if (!options.diversifyAcrossGames) return scored.slice(0, options.maxLeads);
  return pickDiversified(scored, options.maxLeads, initialCap, 3);
}
