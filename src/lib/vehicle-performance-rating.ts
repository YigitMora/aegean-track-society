import "server-only";

import { ModificationCategory, type VehicleRatingStatus } from "@prisma/client";

export const vehicleRatingDisclaimer =
  "ATS Performance Rating; resmi güç, homologasyon veya tur zamanı ölçümü değildir. Araç platformu ve build profiline göre oluşturulan topluluk içi karşılaştırma göstergesidir.";

export const vehicleRatingWeights = {
  power: 0.18,
  handling: 0.24,
  braking: 0.18,
  reliability: 0.12,
  thermal: 0.12,
  trackReadiness: 0.16,
} as const;

type RatingComponent = keyof typeof vehicleRatingWeights;

export type VehicleRatingDefinitionInput = {
  id: string;
  powerRating: number;
  handlingRating: number;
  brakingRating: number;
  reliabilityRating: number;
  thermalRating: number;
  trackReadinessRating: number;
  weightPenalty: number;
  ratingStatus: VehicleRatingStatus;
};

export type VehicleRatingModificationInput = {
  modificationDefinitionId?: string;
  modificationDefinition: {
    id?: string;
    code: string;
    category: ModificationCategory;
    powerImpact: number;
    handlingImpact: number;
    brakingImpact: number;
    reliabilityImpact: number;
    trackReadinessImpact: number;
    modificationImpacts: Array<{
      vehicleDefinitionId: string;
      powerImpact: number;
      handlingImpact: number;
      brakingImpact: number;
      reliabilityImpact: number;
      thermalImpact: number;
      trackReadinessImpact: number;
      active: boolean;
    }>;
  };
};

export type VehiclePerformanceRating = Record<RatingComponent, number> & {
  overall: number;
  status: VehicleRatingStatus;
};

type MutableRating = Record<RatingComponent, number> & {
  overallCap?: number;
};

type ImpactTotals = Record<RatingComponent, number>;

const universalBaseImpactCategories = new Set<ModificationCategory>([
  ModificationCategory.SUSPENSION,
  ModificationCategory.BRAKES,
  ModificationCategory.TYRES,
  ModificationCategory.WHEELS,
  ModificationCategory.COOLING,
  ModificationCategory.SAFETY,
]);

export function calculateVehiclePerformanceRating({
  vehicleDefinition,
  installedModifications,
}: {
  vehicleDefinition: VehicleRatingDefinitionInput | null;
  installedModifications: VehicleRatingModificationInput[];
}): VehiclePerformanceRating | null {
  if (!vehicleDefinition || vehicleDefinition.ratingStatus === "UNAVAILABLE") {
    return null;
  }

  const baseRating = applyWeightPenalty({
    power: vehicleDefinition.powerRating,
    handling: vehicleDefinition.handlingRating,
    braking: vehicleDefinition.brakingRating,
    reliability: vehicleDefinition.reliabilityRating,
    thermal: vehicleDefinition.thermalRating,
    trackReadiness: vehicleDefinition.trackReadinessRating,
  }, vehicleDefinition.weightPenalty);
  const rating = { ...baseRating };
  const impactTotals = emptyImpactTotals();
  const installedCategories = new Set<ModificationCategory>();
  let hasSlickTyres = false;

  for (const modification of installedModifications) {
    const definition = modification.modificationDefinition;
    const impact = impactForDefinition(definition, vehicleDefinition.id);
    installedCategories.add(definition.category);
    hasSlickTyres ||= definition.code === "tyres_slick";

    for (const component of ratingComponents) {
      rating[component] += impact[component];
      impactTotals[component] += impact[component];
    }
  }

  applyBuildBalancePenalties({
    rating,
    baseRating,
    impactTotals,
    installedCategories,
    hasSlickTyres,
  });

  for (const component of ratingComponents) {
    rating[component] = clampRating(rating[component]);
  }

  return {
    ...rating,
    overall: weightedOverall(rating),
    status: vehicleDefinition.ratingStatus,
  };
}

export function calculateProjectedVehiclePerformanceRating({
  vehicleDefinition,
  installedModifications,
  proposedModifications,
}: {
  vehicleDefinition: VehicleRatingDefinitionInput | null;
  installedModifications: VehicleRatingModificationInput[];
  proposedModifications: VehicleRatingModificationInput[];
}): VehiclePerformanceRating | null {
  const mergedModificationsById = new Map<string, VehicleRatingModificationInput>();

  for (const modification of installedModifications) {
    mergedModificationsById.set(ratingModificationKey(modification), modification);
  }

  for (const modification of proposedModifications) {
    const key = ratingModificationKey(modification);

    if (!mergedModificationsById.has(key)) {
      mergedModificationsById.set(key, modification);
    }
  }

  return calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: Array.from(mergedModificationsById.values()),
  });
}

const ratingComponents = [
  "power",
  "handling",
  "braking",
  "reliability",
  "thermal",
  "trackReadiness",
] as const satisfies readonly RatingComponent[];

function impactForDefinition(
  definition: VehicleRatingModificationInput["modificationDefinition"],
  vehicleDefinitionId: string,
): ImpactTotals {
  const platformImpact = definition.modificationImpacts.find(
    (impact) => impact.active && impact.vehicleDefinitionId === vehicleDefinitionId,
  );

  if (platformImpact) {
    return {
      power: platformImpact.powerImpact,
      handling: platformImpact.handlingImpact,
      braking: platformImpact.brakingImpact,
      reliability: platformImpact.reliabilityImpact,
      thermal: platformImpact.thermalImpact,
      trackReadiness: platformImpact.trackReadinessImpact,
    };
  }

  if (!universalBaseImpactCategories.has(definition.category)) {
    return emptyImpactTotals();
  }

  return {
    power: definition.powerImpact,
    handling: definition.handlingImpact,
    braking: definition.brakingImpact,
    reliability: definition.reliabilityImpact,
    thermal: 0,
    trackReadiness: definition.trackReadinessImpact,
  };
}

function applyWeightPenalty(
  rating: MutableRating,
  weightPenalty: number,
): MutableRating {
  if (weightPenalty <= 0) {
    return rating;
  }

  return {
    ...rating,
    handling: rating.handling - Math.ceil(weightPenalty * 0.4),
    braking: rating.braking - Math.ceil(weightPenalty * 0.3),
    trackReadiness: rating.trackReadiness - weightPenalty,
  };
}

function applyBuildBalancePenalties({
  rating,
  baseRating,
  impactTotals,
  installedCategories,
  hasSlickTyres,
}: {
  rating: MutableRating;
  baseRating: MutableRating;
  impactTotals: ImpactTotals;
  installedCategories: Set<ModificationCategory>;
  hasSlickTyres: boolean;
}) {
  const largePowerIncrease = impactTotals.power >= 12;
  const hasBrakingUpgrade = installedCategories.has(ModificationCategory.BRAKES);
  const hasCoolingUpgrade = installedCategories.has(ModificationCategory.COOLING);
  const hasSafetyPreparation = installedCategories.has(ModificationCategory.SAFETY);

  // First-pass balance guardrails keep power-only builds from outrunning their
  // braking, cooling, and safety preparation in the overall rating.
  if (largePowerIncrease && !hasBrakingUpgrade) {
    rating.trackReadiness -= 6;
    rating.overallCap = weightedOverall(baseRating) + 8;
  }

  if (largePowerIncrease && !hasCoolingUpgrade) {
    rating.reliability -= 4;
    rating.thermal -= 6;
  }

  if (hasSlickTyres && !hasSafetyPreparation) {
    rating.trackReadiness = Math.min(rating.trackReadiness, baseRating.trackReadiness + 5);
  }
}

function weightedOverall(rating: MutableRating) {
  const uncappedOverall = clampRating(
    rating.power * vehicleRatingWeights.power +
      rating.handling * vehicleRatingWeights.handling +
      rating.braking * vehicleRatingWeights.braking +
      rating.reliability * vehicleRatingWeights.reliability +
      rating.thermal * vehicleRatingWeights.thermal +
      rating.trackReadiness * vehicleRatingWeights.trackReadiness,
  );
  const overallCap = rating.overallCap ?? null;

  return overallCap === null
    ? uncappedOverall
    : Math.min(uncappedOverall, clampRating(overallCap));
}

function emptyImpactTotals(): ImpactTotals {
  return {
    power: 0,
    handling: 0,
    braking: 0,
    reliability: 0,
    thermal: 0,
    trackReadiness: 0,
  };
}

function clampRating(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratingModificationKey(modification: VehicleRatingModificationInput) {
  return (
    modification.modificationDefinitionId ??
    modification.modificationDefinition.id ??
    modification.modificationDefinition.code
  );
}
