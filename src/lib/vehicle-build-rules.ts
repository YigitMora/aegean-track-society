import "server-only";

import {
  ModificationCategory,
  ModificationRuleType,
  type VehiclePowertrain,
} from "@prisma/client";

export const orderedModificationCategories = [
  ModificationCategory.ENGINE,
  ModificationCategory.ECU,
  ModificationCategory.COOLING,
  ModificationCategory.INTAKE_EXHAUST,
  ModificationCategory.SUSPENSION,
  ModificationCategory.BRAKES,
  ModificationCategory.TYRES,
  ModificationCategory.WHEELS,
  ModificationCategory.DRIVETRAIN,
  ModificationCategory.AERO,
  ModificationCategory.SAFETY,
  ModificationCategory.OTHER,
] as const;

export const modificationCategoryLabels: Record<ModificationCategory, string> = {
  ENGINE: "Motor",
  ECU: "ECU",
  COOLING: "Soğutma",
  INTAKE_EXHAUST: "Emme / Egzoz",
  SUSPENSION: "Süspansiyon",
  BRAKES: "Fren",
  TYRES: "Lastik",
  WHEELS: "Jant",
  DRIVETRAIN: "Aktarma",
  AERO: "Aerodinamik",
  SAFETY: "Güvenlik",
  OTHER: "Diğer",
};

export type VehicleBuildResultCode =
  | "MODIFICATION_NOT_FOUND"
  | "MODIFICATION_INACTIVE"
  | "VEHICLE_NOT_FOUND"
  | "DUPLICATE_MODIFICATION"
  | "COMPONENT_SLOT_OCCUPIED"
  | "MODIFICATION_INCOMPATIBLE"
  | "MODIFICATION_CONFLICT"
  | "MODIFICATION_REQUIREMENT_MISSING"
  | "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM"
  | "MODIFICATION_WRITE_FAILED";

export type VehicleBuildBatchResultCode =
  | "BATCH_EMPTY"
  | "BATCH_TOO_LARGE"
  | "DEFINITION_NOT_FOUND"
  | "DEFINITION_INACTIVE"
  | "DUPLICATE_MODIFICATION"
  | "COMPONENT_SLOT_OCCUPIED"
  | "MODIFICATION_CONFLICT"
  | "MODIFICATION_REQUIREMENT_MISSING"
  | "MODIFICATION_INCOMPATIBLE"
  | "VEHICLE_NOT_FOUND"
  | "BATCH_WRITE_FAILED";

export type VehicleBuildVehicle = {
  id: string;
  userId: string;
  vehicleDefinitionId: string | null;
  vehicleDefinition?: {
    powertrain: VehiclePowertrain;
    platformFamilyId?: string | null;
    engineFamilyId?: string | null;
  } | null;
  brand: string;
  model: string;
  year: number | null;
  deletedAt: Date | null;
};

export type VehicleBuildDefinitionLabel = {
  id: string;
  code?: string;
  category: ModificationCategory;
  brand: string | null;
  name: string;
  variant: string | null;
  componentTypeCode?: string | null;
};

type VehicleBuildCompatibility = {
  active: boolean;
  vehicleDefinitionId: string | null;
  platformFamilyId?: string | null;
  engineFamilyId?: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

type VehicleBuildRequirementGroup = {
  active: boolean;
  description: string | null;
  options: Array<{
    requiredDefinitionId: string;
    requiredDefinition: VehicleBuildDefinitionLabel;
  }>;
};

type VehicleBuildPowertrainApplicability = {
  active: boolean;
  powertrain: VehiclePowertrain;
};

export type VehicleBuildDefinitionForRules = VehicleBuildDefinitionLabel & {
  active: boolean;
  powertrainApplicabilities: VehicleBuildPowertrainApplicability[];
  compatibilities: VehicleBuildCompatibility[];
  requirementGroups: VehicleBuildRequirementGroup[];
  rulesAsSource: Array<{
    active: boolean;
    targetDefinitionId: string;
    ruleType: ModificationRuleType;
  }>;
  rulesAsTarget: Array<{
    active: boolean;
    sourceDefinitionId: string;
    ruleType: ModificationRuleType;
  }>;
};

export type VehicleBuildInstalledModification = {
  id: string;
  modificationDefinitionId: string;
  modificationDefinition: VehicleBuildDefinitionLabel & {
    requirementGroups?: VehicleBuildRequirementGroup[];
  };
};

export type VehicleModificationAvailability =
  | {
      ok: true;
      code: null;
    }
  | {
      ok: false;
      code: Exclude<VehicleBuildResultCode, "VEHICLE_NOT_FOUND" | "MODIFICATION_NOT_FOUND" | "MODIFICATION_WRITE_FAILED" | "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM">;
      conflictingModification?: VehicleBuildInstalledModification;
      missingRequirement?: VehicleBuildRequirementGroup;
    };

export type VehicleModificationRemovalAvailability =
  | {
      ok: true;
      code: null;
    }
  | {
      ok: false;
      code: "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM";
      dependentModification: VehicleBuildInstalledModification;
      missingRequirement: VehicleBuildRequirementGroup;
    };

export type VehicleModificationBatchAvailability =
  | {
      ok: true;
      code: null;
    }
  | {
      ok: false;
      code: Exclude<
        VehicleBuildBatchResultCode,
        | "BATCH_EMPTY"
        | "BATCH_TOO_LARGE"
        | "DEFINITION_NOT_FOUND"
        | "VEHICLE_NOT_FOUND"
        | "BATCH_WRITE_FAILED"
      >;
      offendingDefinitionId: string;
      conflictingModification?: VehicleBuildInstalledModification;
      missingRequirement?: VehicleBuildRequirementGroup;
    };

export function normalizeVehicleIdentity(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR") ?? "";
}

export const genericEcuFallbackCodes = new Set(["ecu_stage_1", "ecu_stage_2"]);

export const singleInstanceComponentTypes = new Set([
  "air_filter",
  "intake",
  "turbo_inlet",
  "charge_pipe",
  "intercooler",
  "oil_cooler",
  "radiator",
  "transmission_cooler",
  "downpipe",
  "cat_back_exhaust",
  "axle_back_exhaust",
  "exhaust_manifold",
  "turbo_upgrade",
  "flex_fuel",
  "flex_fuel_hardware",
  "sport_springs",
  "coilover",
  "damper",
  "anti_roll_bar_front",
  "anti_roll_bar_rear",
  "camber_plate",
  "adjustable_ball_joint",
  "adjustable_control_arm",
  "bushings",
  "strut_brace",
  "chassis_brace",
  "big_brake_kit",
  "brake_pad",
  "brake_disc",
  "brake_cooling",
  "brake_fluid",
  "braided_brake_line",
  "tyre_touring",
  "tyre_uhp_road",
  "tyre_max_performance_road",
  "tyre_extreme_performance",
  "tyre_trackday",
  "tyre_semi_slick",
  "tyre_slick",
  "tyre_wet_racing",
  "wheel",
  "lightweight_wheel",
  "forged_wheel",
  "front_splitter",
  "rear_diffuser",
  "rear_wing",
  "aero_kit",
  "ecu_software",
  "platform_tune_package",
  "transmission_software",
  "clutch",
  "flywheel",
  "lsd",
]);

const tyreSlotComponentTypes = new Set([
  "tyre_touring",
  "tyre_uhp_road",
  "tyre_max_performance_road",
  "tyre_extreme_performance",
  "tyre_trackday",
  "tyre_semi_slick",
  "tyre_slick",
  "tyre_wet_racing",
]);
const wheelSlotComponentTypes = new Set(["wheel", "lightweight_wheel", "forged_wheel"]);
const ecuTuneSlotComponentTypes = new Set(["ecu_software", "platform_tune_package"]);

export function componentSlotKeyForDefinition(definition: {
  componentTypeCode?: string | null;
}) {
  const componentTypeCode = definition.componentTypeCode ?? null;

  if (!componentTypeCode || !singleInstanceComponentTypes.has(componentTypeCode)) {
    return null;
  }

  if (tyreSlotComponentTypes.has(componentTypeCode)) {
    return "tyre";
  }

  if (wheelSlotComponentTypes.has(componentTypeCode)) {
    return "wheel";
  }

  if (ecuTuneSlotComponentTypes.has(componentTypeCode)) {
    return "ecu_software";
  }

  return componentTypeCode;
}

export function isGenericEcuFallbackDefinition(definition: { code?: string }) {
  return Boolean(definition.code && genericEcuFallbackCodes.has(definition.code));
}

export function isNamedProviderEcuTuneDefinition(definition: VehicleBuildDefinitionForRules) {
  if (!definition.active || isGenericEcuFallbackDefinition(definition)) {
    return false;
  }

  if (!definition.brand || definition.brand === "Generic") {
    return false;
  }

  return componentSlotKeyForDefinition(definition) === "ecu_software";
}

export function hasNamedProviderEcuTuneForVehicle({
  vehicle,
  definitions,
}: {
  vehicle: VehicleBuildVehicle;
  definitions: VehicleBuildDefinitionForRules[];
}) {
  if (!vehicle.vehicleDefinitionId) {
    return false;
  }

  return definitions.some(
    (definition) =>
      isNamedProviderEcuTuneDefinition(definition) &&
      isModificationApplicableToVehiclePowertrain(
        definition,
        vehicle.vehicleDefinition?.powertrain ?? null,
      ) &&
      isModificationCompatible(vehicle, definition.compatibilities),
  );
}

export function formatModificationDefinition(definition: {
  code?: string;
  brand: string | null;
  name: string;
  variant: string | null;
  componentTypeCode?: string | null;
}) {
  if (
    definition.code === "brakes_performance_pads" ||
    definition.code === "brakes_track_pads"
  ) {
    return "Fren Balatası · Eski genel kayıt";
  }

  const brand =
    definition.brand && definition.brand !== "Generic" ? definition.brand : null;

  return [brand, definition.name, definition.variant].filter(Boolean).join(" / ");
}

export function evaluateModificationAvailability({
  vehicle,
  definition,
  installedModifications,
  hasNamedProviderEcuTune = false,
}: {
  vehicle: VehicleBuildVehicle;
  definition: VehicleBuildDefinitionForRules;
  installedModifications: VehicleBuildInstalledModification[];
  hasNamedProviderEcuTune?: boolean;
}): VehicleModificationAvailability {
  if (!definition.active) {
    return {
      ok: false,
      code: "MODIFICATION_INACTIVE",
    };
  }

  if (
    !isModificationApplicableToVehiclePowertrain(
      definition,
      vehicle.vehicleDefinition?.powertrain ?? null,
    )
  ) {
    return {
      ok: false,
      code: "MODIFICATION_INCOMPATIBLE",
    };
  }

  if (!isModificationCompatible(vehicle, definition.compatibilities)) {
    return {
      ok: false,
      code: "MODIFICATION_INCOMPATIBLE",
    };
  }

  if (isGenericEcuFallbackDefinition(definition) && hasNamedProviderEcuTune) {
    return {
      ok: false,
      code: "MODIFICATION_INCOMPATIBLE",
    };
  }

  const installedDefinitionIds = new Set(
    installedModifications.map((modification) => modification.modificationDefinitionId),
  );

  if (installedDefinitionIds.has(definition.id)) {
    return {
      ok: false,
      code: "DUPLICATE_MODIFICATION",
    };
  }

  const slotConflictingModification = findComponentSlotConflictingModification({
    definition,
    installedModifications,
  });

  if (slotConflictingModification) {
    return {
      ok: false,
      code: "COMPONENT_SLOT_OCCUPIED",
      conflictingModification: slotConflictingModification,
    };
  }

  const conflictingModification = findConflictingModification({
    definition,
    installedModifications,
  });

  if (conflictingModification) {
    return {
      ok: false,
      code: "MODIFICATION_CONFLICT",
      conflictingModification,
    };
  }

  const missingRequirement = definition.requirementGroups.find((group) => {
    if (!group.active) {
      return false;
    }

    return !group.options.some((option) =>
      installedDefinitionIds.has(option.requiredDefinitionId),
    );
  });

  if (missingRequirement) {
    return {
      ok: false,
      code: "MODIFICATION_REQUIREMENT_MISSING",
      missingRequirement,
    };
  }

  return {
    ok: true,
    code: null,
  };
}

export function evaluateModificationRemoval({
  removingModification,
  installedModifications,
}: {
  removingModification: VehicleBuildInstalledModification;
  installedModifications: VehicleBuildInstalledModification[];
}): VehicleModificationRemovalAvailability {
  const remainingDefinitionIds = new Set(
    installedModifications
      .filter((modification) => modification.id !== removingModification.id)
      .map((modification) => modification.modificationDefinitionId),
  );

  for (const installedModification of installedModifications) {
    if (installedModification.id === removingModification.id) {
      continue;
    }

    for (const group of installedModification.modificationDefinition.requirementGroups ?? []) {
      if (!group.active) {
        continue;
      }

      const removingDefinitionWasAnOption = group.options.some(
        (option) =>
          option.requiredDefinitionId === removingModification.modificationDefinitionId,
      );
      const stillSatisfied = group.options.some((option) =>
        remainingDefinitionIds.has(option.requiredDefinitionId),
      );

      if (removingDefinitionWasAnOption && !stillSatisfied) {
        return {
          ok: false,
          code: "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM",
          dependentModification: installedModification,
          missingRequirement: group,
        };
      }
    }
  }

  return {
    ok: true,
    code: null,
  };
}

export function evaluateModificationBatchAvailability({
  vehicle,
  definitions,
  installedModifications,
  hasNamedProviderEcuTune = false,
}: {
  vehicle: VehicleBuildVehicle;
  definitions: VehicleBuildDefinitionForRules[];
  installedModifications: VehicleBuildInstalledModification[];
  hasNamedProviderEcuTune?: boolean;
}): VehicleModificationBatchAvailability {
  const installedDefinitionIds = new Set(
    installedModifications.map((modification) => modification.modificationDefinitionId),
  );
  const selectedDefinitionIds = new Set(definitions.map((definition) => definition.id));
  const proposedModifications: VehicleBuildInstalledModification[] = definitions.map(
    (definition) => ({
      id: `batch:${definition.id}`,
      modificationDefinitionId: definition.id,
      modificationDefinition: definition,
    }),
  );

  for (const definition of definitions) {
    if (!definition.active) {
      return {
        ok: false,
        code: "DEFINITION_INACTIVE",
        offendingDefinitionId: definition.id,
      };
    }

    if (
      !isModificationApplicableToVehiclePowertrain(
        definition,
        vehicle.vehicleDefinition?.powertrain ?? null,
      )
    ) {
      return {
        ok: false,
        code: "MODIFICATION_INCOMPATIBLE",
        offendingDefinitionId: definition.id,
      };
    }

    if (!isModificationCompatible(vehicle, definition.compatibilities)) {
      return {
        ok: false,
        code: "MODIFICATION_INCOMPATIBLE",
        offendingDefinitionId: definition.id,
      };
    }

    if (isGenericEcuFallbackDefinition(definition) && hasNamedProviderEcuTune) {
      return {
        ok: false,
        code: "MODIFICATION_INCOMPATIBLE",
        offendingDefinitionId: definition.id,
      };
    }

    if (installedDefinitionIds.has(definition.id)) {
      return {
        ok: false,
        code: "DUPLICATE_MODIFICATION",
        offendingDefinitionId: definition.id,
      };
    }

    const slotConflictingModification = findComponentSlotConflictingModification({
      definition,
      installedModifications: [
        ...installedModifications,
        ...proposedModifications.filter(
          (modification) => modification.modificationDefinitionId !== definition.id,
        ),
      ],
    });

    if (slotConflictingModification) {
      return {
        ok: false,
        code: "COMPONENT_SLOT_OCCUPIED",
        offendingDefinitionId: definition.id,
        conflictingModification: slotConflictingModification,
      };
    }

    const conflictingModification = findConflictingModification({
      definition,
      installedModifications: [
        ...installedModifications,
        ...proposedModifications.filter(
          (modification) => modification.modificationDefinitionId !== definition.id,
        ),
      ],
    });

    if (conflictingModification) {
      return {
        ok: false,
        code: "MODIFICATION_CONFLICT",
        offendingDefinitionId: definition.id,
        conflictingModification,
      };
    }

    const missingRequirement = definition.requirementGroups.find((group) => {
      if (!group.active) {
        return false;
      }

      return !group.options.some(
        (option) =>
          installedDefinitionIds.has(option.requiredDefinitionId) ||
          selectedDefinitionIds.has(option.requiredDefinitionId),
      );
    });

    if (missingRequirement) {
      return {
        ok: false,
        code: "MODIFICATION_REQUIREMENT_MISSING",
        offendingDefinitionId: definition.id,
        missingRequirement,
      };
    }
  }

  return {
    ok: true,
    code: null,
  };
}

export function vehicleBuildResultLabel(
  code: VehicleBuildResultCode,
  context?: {
    conflictingModification?: VehicleBuildInstalledModification;
    missingRequirement?: VehicleBuildRequirementGroup;
    dependentModification?: VehicleBuildInstalledModification;
  },
) {
  if (code === "MODIFICATION_NOT_FOUND") {
    return "Parça katalogda bulunamadı.";
  }

  if (code === "MODIFICATION_INACTIVE") {
    return "Bu parça şu anda eklenemez.";
  }

  if (code === "VEHICLE_NOT_FOUND") {
    return "Araç bulunamadı veya bu işlem için uygun değil.";
  }

  if (code === "DUPLICATE_MODIFICATION") {
    return "Bu parça build profiline zaten eklenmiş.";
  }

  if (code === "COMPONENT_SLOT_OCCUPIED") {
    const conflictingName = context?.conflictingModification
      ? formatModificationDefinition(
          context.conflictingModification.modificationDefinition,
        )
      : null;

    return conflictingName
      ? `Bu parça tipinde başka bir ürün zaten yüklü: ${conflictingName}.`
      : "Bu parça tipinde başka bir ürün zaten yüklü.";
  }

  if (code === "MODIFICATION_INCOMPATIBLE") {
    return "Bu parça seçilen araçla uyumlu değil.";
  }

  if (code === "MODIFICATION_CONFLICT") {
    const conflictingName = context?.conflictingModification
      ? formatModificationDefinition(
          context.conflictingModification.modificationDefinition,
        )
      : null;

    return conflictingName
      ? `Çakışıyor: ${conflictingName}`
      : "Bu parça yüklü başka bir parçayla çakışıyor.";
  }

  if (code === "MODIFICATION_REQUIREMENT_MISSING") {
    const requiredNames = context?.missingRequirement?.options
      .map((option) => formatModificationDefinition(option.requiredDefinition))
      .join(" veya ");

    return requiredNames
      ? `Önce şu parça gerekli: ${requiredNames}`
      : "Bu parça için önce başka bir parça eklenmeli.";
  }

  if (code === "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM") {
    const dependentName = context?.dependentModification
      ? formatModificationDefinition(context.dependentModification.modificationDefinition)
      : null;

    return dependentName
      ? `Bu parça ${dependentName} tarafından gerekli.`
      : "Bu parça yüklü başka bir parça tarafından gerekli.";
  }

  return "Build profili güncellenemedi. Lütfen tekrar deneyin.";
}

export function isModificationApplicableToVehiclePowertrain(
  definition: {
    powertrainApplicabilities: VehicleBuildPowertrainApplicability[];
  },
  vehiclePowertrain: VehiclePowertrain | null,
) {
  const activeApplicabilities = definition.powertrainApplicabilities.filter(
    (applicability) => applicability.active,
  );

  if (activeApplicabilities.length === 0) {
    return true;
  }

  if (!vehiclePowertrain) {
    return false;
  }

  return activeApplicabilities.some(
    (applicability) => applicability.powertrain === vehiclePowertrain,
  );
}

function isModificationCompatible(
  vehicle: VehicleBuildVehicle,
  compatibilities: VehicleBuildCompatibility[],
) {
  const activeCompatibilities = compatibilities.filter((compatibility) => compatibility.active);

  if (activeCompatibilities.length === 0) {
    return true;
  }

  if (vehicle.vehicleDefinitionId) {
    const hasExactTemplateMatch = activeCompatibilities.some(
      (compatibility) =>
        compatibility.vehicleDefinitionId === vehicle.vehicleDefinitionId,
    );

    if (hasExactTemplateMatch) {
      return true;
    }
  }

  const vehicleEngineFamilyId = vehicle.vehicleDefinition?.engineFamilyId ?? null;

  if (vehicleEngineFamilyId) {
    const hasEngineFamilyMatch = activeCompatibilities.some(
      (compatibility) => compatibility.engineFamilyId === vehicleEngineFamilyId,
    );

    if (hasEngineFamilyMatch) {
      return true;
    }
  }

  const vehiclePlatformFamilyId = vehicle.vehicleDefinition?.platformFamilyId ?? null;

  if (vehiclePlatformFamilyId) {
    const hasPlatformFamilyMatch = activeCompatibilities.some(
      (compatibility) => compatibility.platformFamilyId === vehiclePlatformFamilyId,
    );

    if (hasPlatformFamilyMatch) {
      return true;
    }
  }

  return activeCompatibilities
    .filter(
      (compatibility) =>
        compatibility.vehicleDefinitionId === null &&
        !compatibility.engineFamilyId &&
        !compatibility.platformFamilyId,
    )
    .some((compatibility) => matchesCompatibility(vehicle, compatibility));
}

function matchesCompatibility(
  vehicle: VehicleBuildVehicle,
  compatibility: VehicleBuildCompatibility,
) {
  if (
    compatibility.vehicleBrand &&
    normalizeVehicleIdentity(compatibility.vehicleBrand) !== normalizeVehicleIdentity(vehicle.brand)
  ) {
    return false;
  }

  if (
    compatibility.vehicleModel &&
    normalizeVehicleIdentity(compatibility.vehicleModel) !== normalizeVehicleIdentity(vehicle.model)
  ) {
    return false;
  }

  if (compatibility.yearFrom !== null || compatibility.yearTo !== null) {
    if (vehicle.year === null) {
      return false;
    }

    if (compatibility.yearFrom !== null && vehicle.year < compatibility.yearFrom) {
      return false;
    }

    if (compatibility.yearTo !== null && vehicle.year > compatibility.yearTo) {
      return false;
    }
  }

  return true;
}

function findConflictingModification({
  definition,
  installedModifications,
}: {
  definition: VehicleBuildDefinitionForRules;
  installedModifications: VehicleBuildInstalledModification[];
}) {
  const sourceConflictTargetIds = new Set(
    definition.rulesAsSource
      .filter(
        (rule) =>
          rule.active && rule.ruleType === ModificationRuleType.CONFLICTS_WITH,
      )
      .map((rule) => rule.targetDefinitionId),
  );
  const targetConflictSourceIds = new Set(
    definition.rulesAsTarget
      .filter(
        (rule) =>
          rule.active && rule.ruleType === ModificationRuleType.CONFLICTS_WITH,
      )
      .map((rule) => rule.sourceDefinitionId),
  );

  return installedModifications.find(
    (modification) =>
      sourceConflictTargetIds.has(modification.modificationDefinitionId) ||
      targetConflictSourceIds.has(modification.modificationDefinitionId),
  );
}

function findComponentSlotConflictingModification({
  definition,
  installedModifications,
}: {
  definition: VehicleBuildDefinitionForRules;
  installedModifications: VehicleBuildInstalledModification[];
}) {
  const slotKey = componentSlotKeyForDefinition(definition);

  if (!slotKey) {
    return undefined;
  }

  return installedModifications.find(
    (modification) =>
      componentSlotKeyForDefinition(modification.modificationDefinition) === slotKey,
  );
}
