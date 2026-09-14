export const WEAKEST_LEG_EVALUATED_MARKER = '__metric:weakest_leg_evaluated__';

export const hasWeakestLegEvaluation = (topReasons: string[] | undefined): boolean =>
  (topReasons ?? []).includes(WEAKEST_LEG_EVALUATED_MARKER);

export const withoutCalibrationMarkers = (topReasons: string[] | undefined): string[] =>
  (topReasons ?? []).filter((reason) => !reason.startsWith('__metric:'));
