import type {
  LifecycleRisk,
  LifecycleRiskDriver,
  LifecycleRiskStage
} from '@/src/core/slips/lifecycleRisk';

export type LifecycleRecommendedAction =
  | 'proceed'
  | 'proceed_cautiously'
  | 'reduce_exposure'
  | 'monitor_closely'
  | 'avoid_chasing'
  | 'review_postmortem';

export type LifecycleActionGuidance = {
  recommended_action: LifecycleRecommendedAction;
  action_label: string;
  action_rationale: string;
  reliability_band: LifecycleRisk['reliability'];
  continuity_note: string | null;
  driver_tags: string[];
  secondary_actions: LifecycleRecommendedAction[];
};

const DRIVER_COPY: Record<LifecycleRiskDriver, string> = {
  balanced_build: 'balanced build',
  inflated_thresholds: 'inflated thresholds',
  volatile_secondary_stats: 'volatile secondary stats',
  correlated_stack_pressure: 'correlated stack pressure',
  late_game_dependency: 'late-game dependency',
  role_mismatch: 'role mismatch',
  hot_hand_regression_risk: 'hot-hand regression risk',
  low_evidence: 'thin evidence'
};

function unique<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function driverTags(risk: LifecycleRisk): string[] {
  return unique([
    risk.primaryDriver,
    ...(risk.secondaryDriver ? [risk.secondaryDriver] : []),
    ...risk.evidence.slice(0, 2).map((item) => item.driver)
  ]);
}

function buildContinuityNote(stage: LifecycleRiskStage, risk: LifecycleRisk): string | null {
  if (risk.carriedThrough) {
    return `${DRIVER_COPY[risk.primaryDriver]} is the same lifecycle pressure showing up again.`;
  }
  if (risk.reliability === 'low' || risk.primaryDriver === 'low_evidence') {
    return 'Evidence is still thin, so keep the next step conservative.';
  }
  if (stage === 'after' && risk.continuityTags.some((tag) => /settled review/i.test(tag))) {
    return 'Use this as a next-build note, not as proof beyond the recorded review.';
  }
  return null;
}

export function deriveLifecycleActionGuidance(input: {
  risk: LifecycleRisk;
  stage: LifecycleRiskStage;
  outcome?: 'won' | 'lost' | 'void' | 'mixed' | 'partial';
}): LifecycleActionGuidance {
  const { risk, stage, outcome } = input;
  const primaryDriverLabel = DRIVER_COPY[risk.primaryDriver];
  const conservative = risk.reliability === 'low' || risk.primaryDriver === 'low_evidence';
  const tags = driverTags(risk);

  if (stage === 'before') {
    if (conservative) {
      return {
        recommended_action: risk.level === 'stable' ? 'proceed_cautiously' : 'monitor_closely',
        action_label: risk.level === 'stable' ? 'Proceed cautiously' : 'Monitor closely',
        action_rationale:
          'The pre-submit read is directionally useful, but the support is still thin enough that it should stay advisory only.',
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: unique(['monitor_closely'])
      };
    }

    if (risk.level === 'stable') {
      return {
        recommended_action: 'proceed',
        action_label: 'Proceed',
        action_rationale:
          'No single lifecycle fragility driver is taking over, so the slip can stay intact if the rest of your price discipline still holds.',
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: ['monitor_closely']
      };
    }

    if (risk.level === 'watch') {
      return {
        recommended_action: 'proceed_cautiously',
        action_label: 'Proceed cautiously',
        action_rationale: `${primaryDriverLabel} is the main watch item, so keep the angle compact and avoid adding extra dependency before submit.`,
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: unique(['monitor_closely'])
      };
    }

    if (risk.level === 'fragile') {
      return {
        recommended_action: 'reduce_exposure',
        action_label: 'Reduce exposure',
        action_rationale: `${primaryDriverLabel} is already the dominant fragility, so the cleanest deterministic adjustment is to trim the amount of risk carried by this slip.`,
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: unique(['proceed_cautiously', 'monitor_closely'])
      };
    }

    return {
      recommended_action:
        risk.primaryDriver === 'inflated_thresholds' ||
        risk.primaryDriver === 'hot_hand_regression_risk'
          ? 'avoid_chasing'
          : 'reduce_exposure',
      action_label:
        risk.primaryDriver === 'inflated_thresholds' ||
        risk.primaryDriver === 'hot_hand_regression_risk'
          ? 'Avoid chasing'
          : 'Reduce exposure',
      action_rationale:
        risk.primaryDriver === 'inflated_thresholds' ||
        risk.primaryDriver === 'hot_hand_regression_risk'
          ? `${primaryDriverLabel} is making the slip high pressure, so do not solve it by adding more reach or heater-style exposure.`
          : `${primaryDriverLabel} is making the slip high pressure, so the bettor-first move is to cut exposure rather than stack more dependency.`,
      reliability_band: risk.reliability,
      continuity_note: buildContinuityNote(stage, risk),
      driver_tags: tags,
      secondary_actions: unique(['reduce_exposure', 'monitor_closely'])
    };
  }

  if (stage === 'during') {
    if (conservative && risk.level !== 'high-pressure') {
      return {
        recommended_action: 'monitor_closely',
        action_label: 'Monitor closely',
        action_rationale:
          'Live evidence is still thin, so keep the read conservative and let the weakest leg confirm the pressure before reacting.',
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: []
      };
    }

    if (risk.level === 'stable') {
      return {
        recommended_action: 'proceed',
        action_label: 'Hold course',
        action_rationale:
          'No single live driver is breaking the ticket shape right now, so the right move is to keep tracking instead of forcing a new story onto it.',
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: ['monitor_closely']
      };
    }

    if (risk.level === 'watch') {
      return {
        recommended_action: 'monitor_closely',
        action_label: 'Monitor closely',
        action_rationale: `${primaryDriverLabel} is raising live pressure, so watch the weakest leg and current script before escalating the read.`,
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: []
      };
    }

    if (risk.level === 'fragile') {
      return {
        recommended_action: 'monitor_closely',
        action_label: 'Monitor closely',
        action_rationale: `${primaryDriverLabel} is concentrating the live downside in a small part of the ticket, so stay on that failure point first.`,
        reliability_band: risk.reliability,
        continuity_note: buildContinuityNote(stage, risk),
        driver_tags: tags,
        secondary_actions: ['reduce_exposure']
      };
    }

    return {
      recommended_action:
        risk.primaryDriver === 'correlated_stack_pressure' ? 'reduce_exposure' : 'monitor_closely',
      action_label:
        risk.primaryDriver === 'correlated_stack_pressure' ? 'Reduce exposure' : 'Monitor closely',
      action_rationale:
        risk.primaryDriver === 'correlated_stack_pressure'
          ? 'The same live script is now carrying too much of the ticket, so keep the guidance focused on cutting concentration rather than inventing a precise execution play.'
          : `${primaryDriverLabel} is now driving high live pressure, so stay on the weakest leg and avoid reading a comeback into thin evidence.`,
      reliability_band: risk.reliability,
      continuity_note: buildContinuityNote(stage, risk),
      driver_tags: tags,
      secondary_actions: unique(['monitor_closely'])
    };
  }

  if (conservative && outcome !== 'lost') {
    return {
      recommended_action: 'review_postmortem',
      action_label: 'Review postmortem',
      action_rationale:
        'The settled evidence is too thin to force a stronger lesson, so keep the takeaway compact and tied to the recorded review only.',
      reliability_band: risk.reliability,
      continuity_note: buildContinuityNote(stage, risk),
      driver_tags: tags,
      secondary_actions: []
    };
  }

  if (risk.level === 'stable' && outcome === 'won') {
    return {
      recommended_action: 'proceed',
      action_label: 'Keep what held',
      action_rationale:
        'The ticket held without one fragility driver taking over, so the main next step is to preserve the same compact build discipline.',
      reliability_band: risk.reliability,
      continuity_note: buildContinuityNote(stage, risk),
      driver_tags: tags,
      secondary_actions: []
    };
  }

  if (risk.level === 'watch' && outcome !== 'won') {
    return {
      recommended_action: 'review_postmortem',
      action_label: 'Review postmortem',
      action_rationale: `${primaryDriverLabel} showed up in the settled review, so tag whether it was process, price, or variance before the next build.`,
      reliability_band: risk.reliability,
      continuity_note: buildContinuityNote(stage, risk),
      driver_tags: tags,
      secondary_actions: []
    };
  }

  if (risk.level === 'fragile' || risk.level === 'high-pressure') {
    return {
      recommended_action: 'review_postmortem',
      action_label: 'Review postmortem',
      action_rationale: risk.carriedThrough
        ? `${primaryDriverLabel} showed up before settlement and still carried through, so make that the first next-build review note.`
        : `${primaryDriverLabel} decided too much of the final result, so review the break point before reusing the same exposure cluster.`,
      reliability_band: risk.reliability,
      continuity_note: buildContinuityNote(stage, risk),
      driver_tags: tags,
      secondary_actions: []
    };
  }

  return {
    recommended_action: 'review_postmortem',
    action_label: 'Review postmortem',
    action_rationale:
      'Keep the settled takeaway conservative and tied to the strongest preserved evidence from this ticket.',
    reliability_band: risk.reliability,
    continuity_note: buildContinuityNote(stage, risk),
    driver_tags: tags,
    secondary_actions: []
  };
}
