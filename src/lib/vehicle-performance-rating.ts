import "server-only";

import { ModificationCategory, type VehicleRatingStatus } from "@prisma/client";
import { isLegacyGenericModificationDefinition } from "@/lib/modification-catalog-metadata";
import {
  applyWeightPenalty,
  calculateVehicleOverall,
  clampRating,
  ratingComponents,
  vehicleRatingWeights,
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
    componentTypeCode?: string | null;
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

const powerTargetComponentTypes = new Set([
  "ecu_software",
  "platform_tune_package",
]);
const cosmeticAeroCodes = new Set([
  "aero_maxton_front_splitter",
  "aero_varis_body_kit",
  "aero_mugen_under_spoiler",
  "aero_cosmetic_front_splitter_technical",
  "aero_rear_spoiler_cosmetic_technical",
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
  let strongestCalibrationImpact: ImpactTotals | null = null;
  let strongestTyreImpact: ImpactTotals | null = null;
  let supportingAirflowPowerImpact = 0;
  let hasSlickTyres = false;

  for (const modification of installedModifications) {
    const definition = modification.modificationDefinition;
    const impact = impactForDefinition(definition, vehicleDefinition.id);
    const componentTypeCode = definition.componentTypeCode ?? null;
    const isLegacyGeneric = isLegacyGenericModificationDefinition(definition);

    hasSlickTyres ||=
      !isLegacyGeneric &&
      (definition.code === "tyres_slick" ||
        componentTypeCode === "tyre_slick");

    if (isPowerTargetDefinition(definition)) {
      if (
        !strongestCalibrationImpact ||
        impact.power > strongestCalibrationImpact.power
      ) {
        strongestCalibrationImpact = impact;
      }
      continue;
    }

    if (
      definition.category === ModificationCategory.TYRES &&
      !isLegacyGeneric
    ) {
      if (
        !strongestTyreImpact ||
        tyreImpactStrength(impact) > tyreImpactStrength(strongestTyreImpact)
      ) {
        strongestTyreImpact = impact;
      }
      continue;
    }

    if (definition.category === ModificationCategory.INTAKE_EXHAUST) {
      supportingAirflowPowerImpact = Math.max(
        supportingAirflowPowerImpact,
        Math.min(1, Math.max(0, impact.power)),
      );
      impact.power = 0;
    }

    applyImpact(rating, impact);
  }

  if (strongestCalibrationImpact) {
    applyImpact(rating, strongestCalibrationImpact);
  }

  if (strongestTyreImpact) {
    applyImpact(rating, strongestTyreImpact);
  }

  if (supportingAirflowPowerImpact > 0) {
    const supportImpact = emptyImpactTotals();
    supportImpact.power = supportingAirflowPowerImpact;
    applyImpact(rating, supportImpact);
  }

  applyBuildBalancePenalties({
    rating,
    baseRating,
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
    return sanitizeCategoryImpact(definition, {
      power: platformImpact.powerImpact,
      handling: platformImpact.handlingImpact,
      braking: platformImpact.brakingImpact,
      reliability: platformImpact.reliabilityImpact,
      thermal: platformImpact.thermalImpact,
      trackReadiness: platformImpact.trackReadinessImpact,
    });
  }

  if (definition.category === ModificationCategory.ECU) {
    return emptyImpactTotals();
  }

  return sanitizeCategoryImpact(definition, {
    power: definition.powerImpact,
    handling: definition.handlingImpact,
    braking: definition.brakingImpact,
    reliability: definition.reliabilityImpact,
    thermal: baseThermalImpactForDefinition(definition),
    trackReadiness: definition.trackReadinessImpact,
  });
}

function applyBuildBalancePenalties({
  rating,
  baseRating,
  hasSlickTyres,
}: {
  rating: MutableRating;
  baseRating: MutableRating;
  hasSlickTyres: boolean;
}) {
  if (hasSlickTyres) {
    rating.trackReadiness = Math.min(rating.trackReadiness, baseRating.trackReadiness + 5);
  }
}

function sanitizeCategoryImpact(
  definition: VehicleRatingModificationInput["modificationDefinition"],
  impact: ImpactTotals,
): ImpactTotals {
  if (
    isLegacyGenericModificationDefinition(definition) ||
    definition.category === ModificationCategory.SAFETY ||
    cosmeticAeroCodes.has(definition.code)
  ) {
    return emptyImpactTotals();
  }

  if (definition.category === ModificationCategory.ECU) {
    return {
      ...impact,
      handling: 0,
      braking: 0,
    };
  }

  if (definition.category === ModificationCategory.ENGINE) {
    return {
      ...impact,
      power: 0,
      handling: 0,
      braking: 0,
    };
  }

  if (definition.category === ModificationCategory.INTAKE_EXHAUST) {
    return {
      ...impact,
      power: Math.min(1, Math.max(0, impact.power)),
      handling: 0,
      braking: 0,
    };
  }

  if (definition.category === ModificationCategory.COOLING) {
    return {
      power: 0,
      handling: 0,
      braking: 0,
      reliability: impact.reliability,
      thermal: impact.thermal,
      trackReadiness: impact.trackReadiness,
    };
  }

  if (definition.category === ModificationCategory.DRIVETRAIN) {
    return {
      ...impact,
      power: 0,
      braking: 0,
      thermal: 0,
    };
  }

  if (definition.category === ModificationCategory.SUSPENSION) {
    return {
      ...impact,
      power: 0,
      braking: 0,
      thermal: 0,
    };
  }

  if (definition.category === ModificationCategory.BRAKES) {
    return {
      ...impact,
      power: 0,
      handling: 0,
      thermal: 0,
    };
  }

  if (definition.category === ModificationCategory.TYRES) {
    return {
      ...impact,
      power: 0,
      thermal: 0,
    };
  }

  if (definition.category === ModificationCategory.WHEELS) {
    return {
      ...impact,
      power: 0,
      thermal: 0,
    };
  }

  if (
    definition.category === ModificationCategory.AERO ||
    definition.category === ModificationCategory.OTHER
  ) {
    return {
      ...impact,
      power: 0,
      thermal: 0,
    };
  }

  return impact;
}

function baseThermalImpactForDefinition(
  definition: VehicleRatingModificationInput["modificationDefinition"],
) {
  const componentTypeCode = definition.componentTypeCode ?? null;

  if (definition.category === ModificationCategory.COOLING) {
    if (componentTypeCode === "thermostat") {
      return 1;
    }

    return componentTypeCode ? 3 : 0;
  }

  if (definition.category === ModificationCategory.INTAKE_EXHAUST) {
    if (
      definition.code === "intake_open_high_flow_vehicle_specific" ||
      componentTypeCode === "downpipe" ||
      componentTypeCode === "sports_catalyst"
    ) {
      return -1;
    }
  }

  if (definition.category === ModificationCategory.ENGINE) {
    if (
      componentTypeCode === "hybrid_turbo" ||
      componentTypeCode === "big_turbo" ||
      componentTypeCode === "turbo_upgrade" ||
      componentTypeCode === "turbocharger_upgrade" ||
      componentTypeCode === "twin_turbo_upgrade" ||
      componentTypeCode === "supercharger_upgrade"
    ) {
      return -4;
    }

    if (
      componentTypeCode === "wastegate" ||
      componentTypeCode === "boost_control" ||
      componentTypeCode === "methanol_injection"
    ) {
      return -1;
    }
  }

  return 0;
}

function isPowerTargetDefinition(
  definition: VehicleRatingModificationInput["modificationDefinition"],
) {
  return Boolean(
    definition.componentTypeCode &&
      powerTargetComponentTypes.has(definition.componentTypeCode),
  );
}

function applyImpact(
  rating: MutableRating,
  impact: ImpactTotals,
) {
  for (const component of ratingComponents) {
    rating[component] += impact[component];
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

function tyreImpactStrength(impact: ImpactTotals) {
  return (
    impact.handling * 3 +
    impact.braking * 2 +
    impact.trackReadiness +
    impact.reliability
  );
}

function ratingModificationKey(modification: VehicleRatingModificationInput) {
  return (
    modification.modificationDefinitionId ??
    modification.modificationDefinition.id ??
    modification.modificationDefinition.code
  );
}
