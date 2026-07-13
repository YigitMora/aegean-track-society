import "server-only";

import { ModificationCategory, type VehicleRatingStatus } from "@prisma/client";
import {
  applyWeightPenalty,
  calculateVehicleOverall,
  clampRating,
  ratingComponents,
  vehicleRatingWeights,
  weightedOverall,
  type MutableRatingScoreSet,
  type RatingComponent,
} from "@/lib/vehicle-rating-core";

export { vehicleRatingWeights };

export const vehicleRatingDisclaimer =
  "ATS Performance Rating; resmi güç, homologasyon veya tur zamanı ölçümü değildir. Araç platformu ve build profiline göre oluşturulan topluluk içi karşılaştırma göstergesidir.";

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

type ImpactTotals = MutableRatingScoreSet;

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

  const baseRating: MutableRating = applyWeightPenalty({
    power: vehicleDefinition.powerRating,
    handling: vehicleDefinition.handlingRating,
    braking: vehicleDefinition.brakingRating,
    reliability: vehicleDefinition.reliabilityRating,
    thermal: vehicleDefinition.thermalRating,
    trackReadiness: vehicleDefinition.trackReadinessRating,
  }, vehicleDefinition.weightPenalty);
  const rating: MutableRating = { ...baseRating };
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
    overall: calculateVehicleOverall({
      rating,
      status: vehicleDefinition.ratingStatus,
      overallCap: rating.overallCap,
    }).overall,
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

function ratingModificationKey(modification: VehicleRatingModificationInput) {
  return (
    modification.modificationDefinitionId ??
    modification.modificationDefinition.id ??
    modification.modificationDefinition.code
  );
}
