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
}: {
  vehicle: VehicleBuildVehicle;
  definition: VehicleBuildDefinitionForRules;
  installedModifications: VehicleBuildInstalledModification[];
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

  const installedDefinitionIds = new Set(
    installedModifications.map((modification) => modification.modificationDefinitionId),
  );

  if (installedDefinitionIds.has(definition.id)) {
    return {
      ok: false,
      code: "DUPLICATE_MODIFICATION",
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
}: {
  vehicle: VehicleBuildVehicle;
  definitions: VehicleBuildDefinitionForRules[];
  installedModifications: VehicleBuildInstalledModification[];
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

    if (installedDefinitionIds.has(definition.id)) {
      return {
        ok: false,
        code: "DUPLICATE_MODIFICATION",
        offendingDefinitionId: definition.id,
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

  return activeCompatibilities
    .filter((compatibility) => compatibility.vehicleDefinitionId === null)
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
