export interface ConfidenceInput {
  evidenceCount: number;
  sourceReliability: number;
  recencyHours: number;
  agreementScore: number;
  modelSelfConsistency: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Deterministic confidence function tuned for receipts-first research.
 *
 * Tunable weights:
 * - evidenceWeight: breadth of corroboration
 * - reliabilityWeight: trust in source quality
 * - recencyWeight: decay over time (fresh evidence scores higher)
 * - agreementWeight: cross-source directional agreement
 * - consistencyWeight: internal rule consistency
 */
const evidenceWeight = 0.2;
const reliabilityWeight = 0.3;
const recencyWeight = 0.2;
const agreementWeight = 0.2;
const consistencyWeight = 0.1;

export const computeConfidence = ({
  evidenceCount,
  sourceReliability,
  recencyHours,
  agreementScore,
  modelSelfConsistency,
}: ConfidenceInput): number => {
  const evidenceScore = clamp01(Math.log2(Math.max(1, evidenceCount) + 1) / 2);
  const reliabilityScore = clamp01(sourceReliability);
  const recencyScore = clamp01(1 - recencyHours / 72);
  const agreement = clamp01(agreementScore);
  const consistency = clamp01(modelSelfConsistency);

  const weighted =
    evidenceScore * evidenceWeight +
    reliabilityScore * reliabilityWeight +
    recencyScore * recencyWeight +
    agreement * agreementWeight +
    consistency * consistencyWeight;

  return Number(clamp01(weighted).toFixed(4));
};
