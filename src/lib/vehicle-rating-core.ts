export const vehicleRatingWeights = {
  power: 0.18,
  handling: 0.24,
  braking: 0.18,
  reliability: 0.12,
  thermal: 0.12,
  trackReadiness: 0.16,
} as const;

export type RatingComponent = keyof typeof vehicleRatingWeights;

export type RatingStatusLike = "CALIBRATED" | "PROVISIONAL" | "UNAVAILABLE";

export type RatingScoreSet = Record<RatingComponent, number>;

export type MutableRatingScoreSet = RatingScoreSet & {
  overallCap?: number;
};

export const ratingComponents = [
  "power",
  "handling",
  "braking",
  "reliability",
  "thermal",
  "trackReadiness",
] as const satisfies readonly RatingComponent[];

export function applyWeightPenalty<T extends RatingScoreSet>(
  rating: T,
  weightPenalty: number,
): T {
  if (weightPenalty <= 0) {
    return { ...rating };
  }

  const effectiveWeightPenalty = calculateEffectiveWeightPenalty(rating, weightPenalty);

  return {
    ...rating,
    handling: rating.handling - Math.ceil(effectiveWeightPenalty * 0.4),
    braking: rating.braking - Math.ceil(effectiveWeightPenalty * 0.3),
    trackReadiness: rating.trackReadiness - effectiveWeightPenalty,
  };
}

export function calculateEffectiveWeightPenalty(
  rating: RatingScoreSet,
  weightPenalty: number,
) {
  if (weightPenalty <= 0) {
    return 0;
  }

  if (!hasEliteTrackComponentEvidence(rating)) {
    return weightPenalty;
  }

  return Math.max(0, weightPenalty - Math.ceil(weightPenalty * 0.7));
}

export function calculateVehicleOverall({
  rating,
  status,
  overallCap = null,
}: {
  rating: RatingScoreSet;
  status: RatingStatusLike;
  overallCap?: number | null;
}) {
  const baseOverall = weightedOverall(rating);
  const eliteAdjustment = calculateEliteTrackReferenceAdjustment(rating, status);
  const uncappedOverall = clampRating(baseOverall + eliteAdjustment);
  const cappedOverall =
    overallCap === null ? uncappedOverall : Math.min(uncappedOverall, clampRating(overallCap));

  return {
    overall: cappedOverall,
    baseOverall,
    eliteAdjustment,
    eliteAdjustmentApplied: eliteAdjustment > 0,
  };
}

export function calculateEliteTrackReferenceAdjustment(
  rating: RatingScoreSet,
  status: RatingStatusLike,
) {
  if (status !== "CALIBRATED" || !hasEliteTrackComponentEvidence(rating)) {
    return 0;
  }

  const thresholdExcesses = [
    rating.handling - 90,
    rating.braking - 90,
    rating.thermal - 88,
    rating.trackReadiness - 92,
  ];
  const averageExcess =
    thresholdExcesses.reduce((total, value) => total + Math.max(0, value), 0) /
    thresholdExcesses.length;

  return Math.min(5, Math.max(2, Math.round(averageExcess * 0.45 + 2)));
}

export function hasEliteTrackComponentEvidence(rating: RatingScoreSet) {
  return (
    rating.handling >= 90 &&
    rating.braking >= 90 &&
    rating.thermal >= 88 &&
    rating.trackReadiness >= 92 &&
    rating.reliability >= 74
  );
}

export function weightedOverall(rating: RatingScoreSet) {
  return clampRating(
    rating.power * vehicleRatingWeights.power +
      rating.handling * vehicleRatingWeights.handling +
      rating.braking * vehicleRatingWeights.braking +
      rating.reliability * vehicleRatingWeights.reliability +
      rating.thermal * vehicleRatingWeights.thermal +
      rating.trackReadiness * vehicleRatingWeights.trackReadiness,
  );
}

export function clampRating(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
