import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  buildBuildThresholdAdvice,
  enrichBuildSlipFromIdeas,
  type BuildThresholdAdvice,
  type BuildThresholdIdea,
  type BuildThresholdMove,
} from '@/src/core/slips/buildThresholdAdvisor';

export type BuildCopilotIntent =
  | 'best_move'
  | 'make_safer'
  | 'selective_push'
  | 'explain_ticket';

export type BuildCopilotMarketState = 'live' | 'cache' | 'demo' | 'unavailable';

export type BuildCopilotAction =
  | {
      kind: 'apply_threshold';
      label: string;
      move: BuildThresholdMove;
    }
  | {
      kind: 'xray';
      label: string;
    }
  | {
      kind: 'hold';
      label: string;
    };

export type BuildCopilotRead = {
  intent: BuildCopilotIntent;
  headline: string;
  answer: string;
  pressure: string;
  evidence: string[];
  action: BuildCopilotAction;
  optionalMove: BuildThresholdMove | null;
  evidenceState: 'verified_market' | 'degraded' | 'structural_only';
  advice: BuildThresholdAdvice;
  enrichedLegs: SlipBuilderLeg[];
};

const pctPts = (value: number) => `${Math.round(Math.abs(value) * 100)} pts`;

const marketLabel = (market: SlipBuilderLeg['marketType']) =>
  market.replace(/_/g, ' ');

const moveSummary = (move: BuildThresholdMove) =>
  `${move.player} ${marketLabel(move.marketType)} ${move.currentLine} → ${move.targetLine}`;

const evidenceFor = (
  advice: BuildThresholdAdvice,
  marketState: BuildCopilotMarketState,
): string[] => {
  const evidence: string[] = [
    `${advice.report.counts.floor} floor · ${advice.report.counts.core} core · ${advice.report.counts.pushed} pushed`,
    `Push budget: ${advice.report.pushedCount}/${advice.report.pushBudget}`,
  ];

  if (marketState === 'live') {
    evidence.push(
      `${advice.baseline.pricedLegCount}/${advice.baseline.totalLegs} legs have verified price context`,
    );
  } else {
    evidence.push('Fresh alternate-market evidence is unavailable; no threshold move will be invented.');
  }

  if (advice.report.formTensionCount > 0) {
    evidence.push(`${advice.report.formTensionCount} leg(s) show recent-form tension.`);
  }

  return evidence.slice(0, 4);
};

const pressureFor = (advice: BuildThresholdAdvice): string => {
  const repair = advice.report.repairCandidates[0];
  if (repair) {
    const form = repair.recentForm?.status === 'tension' ? ' with recent-form tension' : '';
    return `${repair.player} is the clearest construction pressure: ${repair.tier} ${marketLabel(repair.marketType)} ask${form}.`;
  }
  return advice.report.status === 'balanced'
    ? 'No pushed leg currently dominates the construction risk.'
    : advice.report.summary;
};

const xrayAction = (): BuildCopilotAction => ({
  kind: 'xray',
  label: 'X-Ray this ticket',
});

const holdAction = (): BuildCopilotAction => ({
  kind: 'hold',
  label: 'Hold current asks',
});

export function buildBuildCopilotRead(input: {
  legs: SlipBuilderLeg[];
  ideas: BuildThresholdIdea[];
  intent: BuildCopilotIntent;
  marketState: BuildCopilotMarketState;
}): BuildCopilotRead {
  const enrichedLegs = enrichBuildSlipFromIdeas(input.legs, input.ideas);
  const advice = buildBuildThresholdAdvice(enrichedLegs);
  const verifiedMarket = input.marketState === 'live';
  const evidenceState = verifiedMarket
    ? 'verified_market'
    : input.marketState === 'cache'
      ? 'degraded'
      : 'structural_only';
  const evidence = evidenceFor(advice, input.marketState);
  const pressure = pressureFor(advice);

  if (input.intent === 'make_safer') {
    if (verifiedMarket && advice.safety) {
      return {
        intent: input.intent,
        headline: 'One safer move is verified.',
        answer: `${moveSummary(advice.safety)} buys about ${pctPts(advice.safety.probabilityDelta)} of sportsbook-implied probability without changing the player thesis.`,
        pressure,
        evidence,
        action: {
          kind: 'apply_threshold',
          label: `Apply ${advice.safety.targetLine}+`,
          move: advice.safety,
        },
        optionalMove: advice.safety,
        evidenceState,
        advice,
        enrichedLegs,
      };
    }

    return {
      intent: input.intent,
      headline: verifiedMarket ? 'No verified step-down clears the guardrails.' : 'I need a fresh market ladder to make this safer.',
      answer: verifiedMarket
        ? 'Do not manufacture a lower line just to make the card look safer. Keep the current asks and X-Ray the full ticket.'
        : 'I can still explain the structural pressure, but ResearchBets should not recommend a threshold change without a verified alternate line.',
      pressure,
      evidence,
      action: xrayAction(),
      optionalMove: null,
      evidenceState,
      advice,
      enrichedLegs,
    };
  }

  if (input.intent === 'selective_push') {
    if (verifiedMarket && advice.escalation) {
      return {
        intent: input.intent,
        headline: 'There is one selective push available.',
        answer: `${moveSummary(advice.escalation)} is the cleanest verified escalation. It spends about ${pctPts(advice.escalation.probabilityDelta)} of sportsbook-implied probability and stays inside the current push budget.`,
        pressure,
        evidence,
        action: {
          kind: 'apply_threshold',
          label: `Push to ${advice.escalation.targetLine}+`,
          move: advice.escalation,
        },
        optionalMove: advice.escalation,
        evidenceState,
        advice,
        enrichedLegs,
      };
    }

    return {
      intent: input.intent,
      headline: 'Do not add payout pressure here.',
      answer: verifiedMarket
        ? 'No higher verified tier clears the selective-escalation guardrails. Improve price or keep the current thresholds.'
        : 'A selective push requires a fresh alternate-market ladder. ResearchBets will not infer one from historical form alone.',
      pressure,
      evidence,
      action: holdAction(),
      optionalMove: null,
      evidenceState,
      advice,
      enrichedLegs,
    };
  }

  if (input.intent === 'explain_ticket') {
    return {
      intent: input.intent,
      headline:
        advice.report.status === 'balanced'
          ? 'The ticket is structurally balanced.'
          : advice.report.status === 'watch'
            ? 'The ticket has used its push budget.'
            : 'The ticket is carrying too much threshold pressure.',
      answer: advice.report.summary,
      pressure,
      evidence,
      action: xrayAction(),
      optionalMove: verifiedMarket ? advice.safety ?? advice.escalation : null,
      evidenceState,
      advice,
      enrichedLegs,
    };
  }

  if (verifiedMarket && advice.safety && advice.report.status !== 'balanced') {
    return {
      intent: input.intent,
      headline: 'Cleanest move: reduce one ask before adding anything.',
      answer: `${moveSummary(advice.safety)} is the highest-value verified repair. It reduces threshold pressure while preserving the underlying player read.`,
      pressure,
      evidence,
      action: {
        kind: 'apply_threshold',
        label: `Apply ${advice.safety.targetLine}+`,
        move: advice.safety,
      },
      optionalMove: advice.safety,
      evidenceState,
      advice,
      enrichedLegs,
    };
  }

  return {
    intent: input.intent,
    headline:
      advice.report.status === 'balanced'
        ? 'The cleanest move is to stop editing and X-Ray the ticket.'
        : 'The structure needs a deeper X-Ray before another leg or threshold change.',
    answer:
      advice.report.status === 'balanced'
        ? 'No verified construction repair is more important than checking the ticket as a system. Do not raise a line just because there is unused room.'
        : advice.report.summary,
    pressure,
    evidence,
    action: xrayAction(),
    optionalMove: verifiedMarket ? advice.safety ?? advice.escalation : null,
    evidenceState,
    advice,
    enrichedLegs,
  };
}
