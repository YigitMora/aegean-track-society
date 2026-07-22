import "server-only";

import { Prisma } from "@prisma/client";
import {
  canAddActiveVehicle,
  canArchiveVehicleCount,
  canRestoreVehicleCount,
} from "@/lib/garage-capacity";
import type { GarageLifecycleErrorCode } from "@/lib/garage-lifecycle-state";
import { prisma } from "@/lib/prisma";
import { arePlateNumbersEquivalent } from "@/lib/registration-validation";
import {
  evaluateModificationBatchAvailability,
  formatModificationDefinition,
  hasNamedProviderEcuTuneForVehicle,
  hasNamedProviderTurboForVehicle,
  isGenericEcuFallbackDefinition,
  isGenericTurboFallbackDefinition,
  type VehicleBuildVehicle,
} from "@/lib/vehicle-build-rules";
import type { VehicleInput } from "@/lib/vehicle-validation";
import { isCatalogVehicleYearAllowed } from "@/lib/vehicle-year-contract";

export type GarageServiceErrorCode = GarageLifecycleErrorCode;

export type GarageActorContext =
  | {
      type: "member";
    }
  | {
      type: "admin";
      adminUserId: string;
      ipAddress?: string | null;
      reason?: string | null;
    };

export type GarageServiceResult<T extends object = object> =
  | ({
      ok: true;
    } & T)
  | {
      ok: false;
      code: GarageServiceErrorCode;
      blockingModifications?: string[];
      existingVehicleId?: string;
    };

const memberActor: GarageActorContext = {
  type: "member",
};

const vehicleSnapshotSelect = {
  id: true,
  userId: true,
  vehicleDefinitionId: true,
  brand: true,
  model: true,
  year: true,
  plateNumber: true,
  color: true,
  isPrimary: true,
  imagePath: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VehicleSelect;

const vehicleDefinitionValidationSelect = {
  id: true,
  brand: true,
  model: true,
  yearFrom: true,
  yearTo: true,
} satisfies Prisma.VehicleDefinitionSelect;

const vehicleDefinitionMatchSelect = {
  id: true,
  code: true,
  brand: true,
  model: true,
  generation: true,
  chassisCode: true,
  variant: true,
  yearFrom: true,
  yearTo: true,
  powertrain: true,
  platformFamilyId: true,
  engineFamilyId: true,
  powerRating: true,
  handlingRating: true,
  brakingRating: true,
  reliabilityRating: true,
  thermalRating: true,
  trackReadinessRating: true,
  weightPenalty: true,
  ratingStatus: true,
  platformFamily: {
    select: {
      code: true,
      brand: true,
      name: true,
      generation: true,
    },
  },
  engineFamily: {
    select: {
      code: true,
      manufacturer: true,
      name: true,
    },
  },
} satisfies Prisma.VehicleDefinitionSelect;

const modificationDefinitionLabelSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
} satisfies Prisma.ModificationDefinitionSelect;

const modificationDefinitionRuleSelect = {
  id: true,
  active: true,
  category: true,
  code: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  usageClass: true,
  compatibilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      vehicleBrand: true,
      vehicleModel: true,
      vehicleDefinitionId: true,
      platformFamilyId: true,
      engineFamilyId: true,
      yearFrom: true,
      yearTo: true,
    },
  },
  powertrainApplicabilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      powertrain: true,
    },
  },
  requirementGroups: {
    where: {
      active: true,
    },
    select: {
      active: true,
      description: true,
      options: {
        select: {
          requiredDefinitionId: true,
          requiredDefinition: {
            select: modificationDefinitionLabelSelect,
          },
        },
      },
    },
  },
  rulesAsSource: {
    where: {
      active: true,
    },
    select: {
      active: true,
      targetDefinitionId: true,
      ruleType: true,
    },
  },
  rulesAsTarget: {
    where: {
      active: true,
    },
    select: {
      active: true,
      sourceDefinitionId: true,
      ruleType: true,
    },
  },
} satisfies Prisma.ModificationDefinitionSelect;

type GarageTransaction = Prisma.TransactionClient;
type VehicleSnapshotRow = Prisma.VehicleGetPayload<{
  select: typeof vehicleSnapshotSelect;
}>;
type VehicleDefinitionValidationRow = Prisma.VehicleDefinitionGetPayload<{
  select: typeof vehicleDefinitionValidationSelect;
}>;
type VehicleDefinitionMatchRow = Prisma.VehicleDefinitionGetPayload<{
  select: typeof vehicleDefinitionMatchSelect;
}>;
type InstalledModificationRuleRow = Prisma.VehicleModificationGetPayload<{
  select: {
    id: true;
    modificationDefinitionId: true;
    modificationDefinition: {
      select: typeof modificationDefinitionRuleSelect;
    };
  };
}>;

type ResolvedVehicleInput = VehicleInput & {
  vehicleDefinitionId: string | null;
};

export async function createGarageVehicle({
  targetUserId,
  input,
  actor = memberActor,
}: {
  targetUserId: string;
  input: VehicleInput;
  actor?: GarageActorContext;
}): Promise<GarageServiceResult<{ vehicleId: string }>> {
  return runGarageSerializableTransaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return garageFailure("not_found");
    }

    const vehicleInput = await resolveVehicleInputForWrite(tx, input);

    if (!vehicleInput) {
      return garageFailure("invalid");
    }

    const activeVehicleCount = await tx.vehicle.count({
      where: {
        userId: targetUserId,
        deletedAt: null,
      },
    });

    if (!canAddActiveVehicle(activeVehicleCount)) {
      return garageFailure("active_vehicle_limit_reached");
    }

    const duplicateVehicle = await findActiveVehicleByPlate({
      tx,
      targetUserId,
      plateNumber: vehicleInput.plateNumber,
    });

    if (duplicateVehicle) {
      return garageFailure("duplicate_plate", {
        existingVehicleId: duplicateVehicle.id,
      });
    }

    const activePrimaryCount = await tx.vehicle.count({
      where: {
        userId: targetUserId,
        deletedAt: null,
        isPrimary: true,
      },
    });
    const shouldBecomePrimary = vehicleInput.isPrimary || activePrimaryCount === 0;

    if (shouldBecomePrimary) {
      await tx.vehicle.updateMany({
        where: {
          userId: targetUserId,
          deletedAt: null,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const vehicle = await tx.vehicle.create({
      data: {
        userId: targetUserId,
        vehicleDefinitionId: vehicleInput.vehicleDefinitionId,
        brand: vehicleInput.brand,
        model: vehicleInput.model,
        year: vehicleInput.year,
        plateNumber: vehicleInput.plateNumber,
        color: vehicleInput.color,
        isPrimary: shouldBecomePrimary,
      },
      select: vehicleSnapshotSelect,
    });

    await createAdminAuditLog({
      tx,
      actor,
      action: "ADMIN_GARAGE_VEHICLE_CREATED",
      targetUserId,
      vehicleIds: [vehicle.id],
      before: null,
      after: {
        vehicle: snapshotVehicle(vehicle),
      },
    });

    return {
      ok: true as const,
      vehicleId: vehicle.id,
    };
  });
}

export async function updateGarageVehicle({
  targetUserId,
  vehicleId,
  input,
  includeArchived = false,
  preservePrimary = false,
  actor = memberActor,
}: {
  targetUserId: string;
  vehicleId: string;
  input: VehicleInput;
  includeArchived?: boolean;
  preservePrimary?: boolean;
  actor?: GarageActorContext;
}): Promise<GarageServiceResult<{ vehicleId: string }>> {
  return runGarageSerializableTransaction(async (tx) => {
    const existingVehicle = await tx.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: targetUserId,
        ...(includeArchived ? {} : { deletedAt: null }),
      },
      select: vehicleSnapshotSelect,
    });

    if (!existingVehicle) {
      return garageFailure("not_found");
    }

    const vehicleInput = await resolveVehicleInputForWrite(tx, input);

    if (!vehicleInput) {
      return garageFailure("invalid");
    }

    const duplicateVehicle = existingVehicle.deletedAt
      ? null
      : await findActiveVehicleByPlate({
          tx,
          targetUserId,
          plateNumber: vehicleInput.plateNumber,
          excludeVehicleId: vehicleId,
        });

    if (duplicateVehicle) {
      return garageFailure("duplicate_plate");
    }

    const compatibility = await guardVehicleDefinitionChange({
      tx,
      targetUserId,
      existingVehicle,
      nextVehicle: {
        vehicleDefinitionId: vehicleInput.vehicleDefinitionId,
        brand: vehicleInput.brand,
        model: vehicleInput.model,
        year: vehicleInput.year,
      },
    });

    if (!compatibility.ok) {
      return compatibility;
    }

    const shouldBePrimary = preservePrimary
      ? existingVehicle.isPrimary
      : vehicleInput.isPrimary;

    if (
      existingVehicle.deletedAt === null &&
      shouldBePrimary &&
      !existingVehicle.isPrimary
    ) {
      await tx.vehicle.updateMany({
        where: {
          userId: targetUserId,
          deletedAt: null,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const vehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },
      data: {
        vehicleDefinitionId: vehicleInput.vehicleDefinitionId,
        brand: vehicleInput.brand,
        model: vehicleInput.model,
        year: vehicleInput.year,
        plateNumber: vehicleInput.plateNumber,
        color: vehicleInput.color,
        ...(existingVehicle.deletedAt === null && shouldBePrimary
          ? { isPrimary: true }
          : {}),
      },
      select: vehicleSnapshotSelect,
    });

    await createAdminAuditLog({
      tx,
      actor,
      action: "ADMIN_GARAGE_VEHICLE_UPDATED",
      targetUserId,
      vehicleIds: [vehicle.id],
      before: {
        vehicle: snapshotVehicle(existingVehicle),
      },
      after: {
        vehicle: snapshotVehicle(vehicle),
      },
    });

    return {
      ok: true as const,
      vehicleId: vehicle.id,
    };
  });
}

export async function makePrimaryGarageVehicle({
  targetUserId,
  vehicleId,
  actor = memberActor,
}: {
  targetUserId: string;
  vehicleId: string;
  actor?: GarageActorContext;
}): Promise<GarageServiceResult<{ vehicleId: string; changed: boolean }>> {
  return runGarageSerializableTransaction(async (tx) => {
    const existingVehicle = await tx.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: targetUserId,
        deletedAt: null,
      },
      select: vehicleSnapshotSelect,
    });

    if (!existingVehicle) {
      return garageFailure("not_found");
    }

    if (existingVehicle.isPrimary) {
      return {
        ok: true as const,
        vehicleId: existingVehicle.id,
        changed: false,
      };
    }

    await tx.vehicle.updateMany({
      where: {
        userId: targetUserId,
        deletedAt: null,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    const vehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },
      data: {
        isPrimary: true,
      },
      select: vehicleSnapshotSelect,
    });

    await createAdminAuditLog({
      tx,
      actor,
      action: "ADMIN_GARAGE_PRIMARY_CHANGED",
      targetUserId,
      vehicleIds: [vehicle.id],
      before: {
        vehicle: snapshotVehicle(existingVehicle),
      },
      after: {
        vehicle: snapshotVehicle(vehicle),
      },
    });

    return {
      ok: true as const,
      vehicleId: vehicle.id,
      changed: true,
    };
  });
}

export async function archiveGarageVehicles({
  targetUserId,
  vehicleIds,
  actor = memberActor,
}: {
  targetUserId: string;
  vehicleIds: string[];
  actor?: GarageActorContext;
}): Promise<
  GarageServiceResult<{
    count: number;
    hadPrimaryVehicle: boolean;
  }>
> {
  const selectedVehicleIds = uniqueIds(vehicleIds);
  const transactionStartedAt = lifecycleNow();

  if (selectedVehicleIds.length === 0) {
    return garageFailure("batch_empty");
  }

  const result = await runGarageSerializableTransaction(async (tx) => {
    const validationStartedAt = lifecycleNow();
    const vehicles = await tx.vehicle.findMany({
      where: {
        id: {
          in: selectedVehicleIds,
        },
        userId: targetUserId,
      },
      select: vehicleSnapshotSelect,
    });
    logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
      userId: targetUserId,
      selectedVehicleCount: selectedVehicleIds.length,
      durationMs: lifecycleDuration(validationStartedAt),
      resultCode: "vehicle_validation_query",
    });

    if (vehicles.length !== selectedVehicleIds.length) {
      return garageFailure("not_found", {
        hadPrimaryVehicle: false,
      });
    }

    if (vehicles.some((vehicle) => vehicle.deletedAt !== null)) {
      return garageFailure("archive_failed", {
        hadPrimaryVehicle: false,
      });
    }

    const archivedVehicleCount = await tx.vehicle.count({
      where: {
        userId: targetUserId,
        deletedAt: {
          not: null,
        },
      },
    });

    if (!canArchiveVehicleCount(archivedVehicleCount, selectedVehicleIds.length)) {
      return garageFailure("archived_vehicle_limit_reached", {
        hadPrimaryVehicle: false,
      });
    }

    const archivedPrimary = vehicles.some((vehicle) => vehicle.isPrimary);
    const now = new Date();
    const archived = await tx.vehicle.updateMany({
      where: {
        id: {
          in: selectedVehicleIds,
        },
        userId: targetUserId,
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        isPrimary: false,
      },
    });

    if (archived.count !== selectedVehicleIds.length) {
      return garageFailure("archive_failed", {
        hadPrimaryVehicle: archivedPrimary,
      });
    }

    if (archivedPrimary) {
      const primaryStartedAt = lifecycleNow();
      const nextPrimaryVehicle = await tx.vehicle.findFirst({
        where: {
          userId: targetUserId,
          deletedAt: null,
        },
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
        },
      });

      if (nextPrimaryVehicle) {
        await tx.vehicle.update({
          where: {
            id: nextPrimaryVehicle.id,
          },
          data: {
            isPrimary: true,
          },
          select: {
            id: true,
          },
        });
      }

      logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
        userId: targetUserId,
        selectedVehicleCount: selectedVehicleIds.length,
        hadPrimaryVehicle: true,
        durationMs: lifecycleDuration(primaryStartedAt),
        resultCode: "primary_reassignment",
      });
    }

    const afterVehicles = await tx.vehicle.findMany({
      where: {
        id: {
          in: selectedVehicleIds,
        },
        userId: targetUserId,
      },
      select: vehicleSnapshotSelect,
    });

    await createAdminAuditLogsForVehicles({
      tx,
      actor,
      action: "ADMIN_GARAGE_VEHICLE_ARCHIVED",
      targetUserId,
      beforeVehicles: vehicles,
      afterVehicles,
    });

    return {
      ok: true as const,
      count: archived.count,
      hadPrimaryVehicle: archivedPrimary,
    };
  });

  logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
    userId: targetUserId,
    selectedVehicleCount: selectedVehicleIds.length,
    hadPrimaryVehicle: result.ok ? result.hadPrimaryVehicle : undefined,
    durationMs: lifecycleDuration(transactionStartedAt),
    resultCode: "archive_transaction",
  });

  return result;
}

export async function restoreGarageVehicle({
  targetUserId,
  vehicleId,
  actor = memberActor,
}: {
  targetUserId: string;
  vehicleId: string;
  actor?: GarageActorContext;
}): Promise<GarageServiceResult<{ vehicleId: string }>> {
  return runGarageSerializableTransaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: targetUserId,
        deletedAt: {
          not: null,
        },
      },
      select: vehicleSnapshotSelect,
    });

    if (!vehicle) {
      return garageFailure("not_found");
    }

    const activeVehicleCount = await tx.vehicle.count({
      where: {
        userId: targetUserId,
        deletedAt: null,
      },
    });

    if (!canRestoreVehicleCount(activeVehicleCount, 1)) {
      return garageFailure("active_vehicle_limit_reached");
    }

    const duplicateVehicle = await findActiveVehicleByPlate({
      tx,
      targetUserId,
      plateNumber: vehicle.plateNumber,
    });

    if (duplicateVehicle) {
      return garageFailure("restore_conflict");
    }

    const activePrimaryVehicle = await tx.vehicle.findFirst({
      where: {
        userId: targetUserId,
        deletedAt: null,
        isPrimary: true,
      },
      select: {
        id: true,
      },
    });

    const restoredVehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },
      data: {
        deletedAt: null,
        isPrimary: !activePrimaryVehicle,
      },
      select: vehicleSnapshotSelect,
    });

    await createAdminAuditLog({
      tx,
      actor,
      action: "ADMIN_GARAGE_VEHICLE_RESTORED",
      targetUserId,
      vehicleIds: [vehicle.id],
      before: {
        vehicle: snapshotVehicle(vehicle),
      },
      after: {
        vehicle: snapshotVehicle(restoredVehicle),
      },
    });

    return {
      ok: true as const,
      vehicleId: restoredVehicle.id,
    };
  });
}

export async function permanentlyDeleteArchivedGarageVehicles({
  targetUserId,
  vehicleIds,
  actor = memberActor,
}: {
  targetUserId: string;
  vehicleIds: string[];
  actor?: GarageActorContext;
}): Promise<
  GarageServiceResult<{
    vehicleRowsDeleted: number;
    registrationRowsUnlinked: number;
    modificationRowsDeleted: number;
    imagePaths: string[];
  }>
> {
  const selectedVehicleIds = uniqueIds(vehicleIds);
  const transactionStartedAt = lifecycleNow();

  if (selectedVehicleIds.length === 0) {
    return garageFailure("batch_empty", {
      imagePaths: [],
    });
  }

  const result = await runGarageSerializableTransaction(async (tx) => {
    const validationStartedAt = lifecycleNow();
    const vehicles = await tx.vehicle.findMany({
      where: {
        id: {
          in: selectedVehicleIds,
        },
        userId: targetUserId,
      },
      select: vehicleSnapshotSelect,
    });
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: targetUserId,
      selectedVehicleCount: selectedVehicleIds.length,
      durationMs: lifecycleDuration(validationStartedAt),
      resultCode: "vehicle_validation_query",
    });

    if (vehicles.length !== selectedVehicleIds.length) {
      return garageFailure("not_found", {
        imagePaths: [],
      });
    }

    if (vehicles.some((vehicle) => vehicle.deletedAt === null)) {
      return garageFailure("active_delete_forbidden", {
        imagePaths: [],
      });
    }

    const registrationStartedAt = lifecycleNow();
    const linkedRegistrations = await tx.registration.findMany({
      where: {
        vehicleId: {
          in: selectedVehicleIds,
        },
      },
      select: {
        id: true,
        vehicleId: true,
        carBrandModel: true,
        plateNumber: true,
      },
    });
    const unlinkedRegistrations = await tx.registration.updateMany({
      where: {
        vehicleId: {
          in: selectedVehicleIds,
        },
      },
      data: {
        vehicleId: null,
      },
    });
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: targetUserId,
      selectedVehicleCount: selectedVehicleIds.length,
      registrationRowsUnlinked: unlinkedRegistrations.count,
      durationMs: lifecycleDuration(registrationStartedAt),
      resultCode: "registration_unlink",
    });

    const modificationStartedAt = lifecycleNow();
    const deletedModifications = await tx.vehicleModification.deleteMany({
      where: {
        vehicleId: {
          in: selectedVehicleIds,
        },
      },
    });
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: targetUserId,
      selectedVehicleCount: selectedVehicleIds.length,
      modificationRowsDeleted: deletedModifications.count,
      durationMs: lifecycleDuration(modificationStartedAt),
      resultCode: "modification_deletion",
    });

    const deletionStartedAt = lifecycleNow();
    const deletedVehicles = await tx.vehicle.deleteMany({
      where: {
        id: {
          in: selectedVehicleIds,
        },
        userId: targetUserId,
        deletedAt: {
          not: null,
        },
      },
    });
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: targetUserId,
      selectedVehicleCount: selectedVehicleIds.length,
      vehicleRowsDeleted: deletedVehicles.count,
      durationMs: lifecycleDuration(deletionStartedAt),
      resultCode: "vehicle_deletion",
    });

    if (deletedVehicles.count !== selectedVehicleIds.length) {
      return garageFailure("delete_failed", {
        imagePaths: [],
      });
    }

    const imagePaths = vehicles.flatMap((vehicle) =>
      vehicle.imagePath ? [vehicle.imagePath] : [],
    );

    await createAdminAuditLogsForVehicles({
      tx,
      actor,
      action: "ADMIN_GARAGE_VEHICLE_DELETED",
      targetUserId,
      beforeVehicles: vehicles,
      afterVehicles: [],
      afterForAll: {
        deletedVehicleIds: selectedVehicleIds,
        registrationRowsUnlinked: unlinkedRegistrations.count,
        modificationRowsDeleted: deletedModifications.count,
        vehicleRowsDeleted: deletedVehicles.count,
        preservedRegistrationSnapshots: linkedRegistrations.map((registration) => ({
          id: registration.id,
          vehicleId: registration.vehicleId,
          carBrandModel: registration.carBrandModel,
          plateNumber: registration.plateNumber,
        })),
      },
    });

    return {
      ok: true as const,
      vehicleRowsDeleted: deletedVehicles.count,
      registrationRowsUnlinked: unlinkedRegistrations.count,
      modificationRowsDeleted: deletedModifications.count,
      imagePaths,
    };
  });

  logLifecycleTiming("GARAGE_DELETE_BATCH", {
    userId: targetUserId,
    selectedVehicleCount: selectedVehicleIds.length,
    imageObjectCount: result.ok ? result.imagePaths.length : 0,
    durationMs: lifecycleDuration(transactionStartedAt),
    resultCode: "delete_transaction",
  });

  return result;
}

export async function matchGarageVehicleDefinition({
  targetUserId,
  vehicleId,
  vehicleDefinitionId,
  normalizeIdentity = true,
  actor = memberActor,
}: {
  targetUserId: string;
  vehicleId: string;
  vehicleDefinitionId: string;
  normalizeIdentity?: boolean;
  actor?: GarageActorContext;
}): Promise<
  GarageServiceResult<{
    vehicleId: string;
    vehicleDefinition: VehicleDefinitionMatchRow;
  }>
> {
  return runGarageSerializableTransaction(async (tx) => {
    const existingVehicle = await tx.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: targetUserId,
      },
      select: vehicleSnapshotSelect,
    });

    if (!existingVehicle) {
      return garageFailure("not_found");
    }

    const vehicleDefinition = await tx.vehicleDefinition.findFirst({
      where: {
        id: vehicleDefinitionId,
        active: true,
      },
      select: vehicleDefinitionMatchSelect,
    });

    if (!vehicleDefinition) {
      return garageFailure("invalid");
    }

    const nextYear = yearForCatalogMatch(existingVehicle.year, vehicleDefinition);

    if (nextYear === undefined) {
      return garageFailure("invalid");
    }

    const nextVehicle = {
      vehicleDefinitionId: vehicleDefinition.id,
      brand: normalizeIdentity ? vehicleDefinition.brand : existingVehicle.brand,
      model: normalizeIdentity ? vehicleDefinition.model : existingVehicle.model,
      year: nextYear,
    };
    const compatibility = await guardVehicleDefinitionChange({
      tx,
      targetUserId,
      existingVehicle,
      nextVehicle,
    });

    if (!compatibility.ok) {
      return compatibility;
    }

    const updatedVehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },
      data: {
        vehicleDefinitionId: vehicleDefinition.id,
        brand: nextVehicle.brand,
        model: nextVehicle.model,
        year: nextVehicle.year,
      },
      select: vehicleSnapshotSelect,
    });

    await createAdminAuditLog({
      tx,
      actor,
      action: "ADMIN_GARAGE_VEHICLE_DEFINITION_MATCHED",
      targetUserId,
      vehicleIds: [updatedVehicle.id],
      before: {
        vehicle: snapshotVehicle(existingVehicle),
      },
      after: {
        vehicle: snapshotVehicle(updatedVehicle),
        vehicleDefinition: snapshotVehicleDefinition(vehicleDefinition),
        normalizeIdentity,
      },
    });

    return {
      ok: true as const,
      vehicleId: updatedVehicle.id,
      vehicleDefinition,
    };
  });
}

export async function runGarageSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  { timeoutMs }: { timeoutMs?: number } = {},
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        ...(timeoutMs === undefined ? {} : { timeout: timeoutMs }),
      });
    } catch (error) {
      if (attempt < 3 && isGarageSerializableConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Garage serializable transaction failed.");
}

function isGarageSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function findActiveVehicleByPlate({
  tx,
  targetUserId,
  plateNumber,
  excludeVehicleId,
}: {
  tx: GarageTransaction;
  targetUserId: string;
  plateNumber: string;
  excludeVehicleId?: string;
}) {
  const activeVehicles = await tx.vehicle.findMany({
    where: {
      userId: targetUserId,
      deletedAt: null,
      ...(excludeVehicleId ? { id: { not: excludeVehicleId } } : {}),
    },
    select: {
      id: true,
      plateNumber: true,
    },
  });

  return (
    activeVehicles.find(
      (vehicle) => arePlateNumbersEquivalent(vehicle.plateNumber, plateNumber),
    ) ?? null
  );
}

async function resolveVehicleInputForWrite(
  tx: GarageTransaction,
  input: VehicleInput,
): Promise<ResolvedVehicleInput | null> {
  if (!input.vehicleDefinitionId) {
    return {
      ...input,
      vehicleDefinitionId: null,
    };
  }

  const definition = await tx.vehicleDefinition.findFirst({
    where: {
      id: input.vehicleDefinitionId,
      active: true,
    },
    select: vehicleDefinitionValidationSelect,
  });

  if (!definition || !input.year || !isYearCompatible(input.year, definition)) {
    return null;
  }

  return {
    ...input,
    vehicleDefinitionId: definition.id,
    brand: definition.brand,
    model: definition.model,
  };
}

async function guardVehicleDefinitionChange({
  tx,
  targetUserId,
  existingVehicle,
  nextVehicle,
}: {
  tx: GarageTransaction;
  targetUserId: string;
  existingVehicle: VehicleSnapshotRow;
  nextVehicle: {
    vehicleDefinitionId: string | null;
    brand: string;
    model: string;
    year: number | null;
  };
}): Promise<GarageServiceResult> {
  if (
    !nextVehicle.vehicleDefinitionId ||
    nextVehicle.vehicleDefinitionId === existingVehicle.vehicleDefinitionId
  ) {
    return {
      ok: true as const,
    };
  }

  const installedModifications = await tx.vehicleModification.findMany({
    where: {
      vehicleId: existingVehicle.id,
      deletedAt: null,
    },
    select: {
      id: true,
      modificationDefinitionId: true,
      modificationDefinition: {
        select: modificationDefinitionRuleSelect,
      },
    },
  });

  if (installedModifications.length === 0) {
    return {
      ok: true as const,
    };
  }

  const vehicleDefinition = await tx.vehicleDefinition.findUnique({
    where: {
      id: nextVehicle.vehicleDefinitionId,
    },
    select: {
      id: true,
      powertrain: true,
      platformFamilyId: true,
      engineFamilyId: true,
    },
  });

  if (!vehicleDefinition) {
    return garageFailure("invalid");
  }

  const proposedVehicle: VehicleBuildVehicle = {
    id: existingVehicle.id,
    userId: targetUserId,
    vehicleDefinitionId: vehicleDefinition.id,
    vehicleDefinition,
    brand: nextVehicle.brand,
    model: nextVehicle.model,
    year: nextVehicle.year,
    deletedAt: existingVehicle.deletedAt,
  };
  const definitions = installedModifications.map(
    (modification) => modification.modificationDefinition,
  );
  const availability = evaluateModificationBatchAvailability({
    vehicle: proposedVehicle,
    definitions,
    installedModifications: [],
    hasNamedProviderEcuTune: installedModifications.some((modification) =>
      isGenericEcuFallbackDefinition(modification.modificationDefinition),
    )
      ? hasNamedProviderEcuTuneForVehicle({
          vehicle: proposedVehicle,
          definitions,
        })
      : false,
    hasNamedProviderTurbo: installedModifications.some((modification) =>
      isGenericTurboFallbackDefinition(modification.modificationDefinition),
    )
      ? hasNamedProviderTurboForVehicle({
          vehicle: proposedVehicle,
          definitions,
        })
      : false,
  });

  if (availability.ok) {
    return {
      ok: true as const,
    };
  }

  return {
    ok: false,
    code: "incompatible_modifications_block_match",
    blockingModifications: blockingModificationNames(
      proposedVehicle,
      installedModifications,
      availability.offendingDefinitionId,
    ),
  };
}

function blockingModificationNames(
  vehicle: VehicleBuildVehicle,
  installedModifications: InstalledModificationRuleRow[],
  offendingDefinitionId?: string,
) {
  const directlyBlocking = installedModifications.filter((modification) => {
    const definition = modification.modificationDefinition;
    const availability = evaluateModificationBatchAvailability({
      vehicle,
      definitions: [definition],
      installedModifications: [],
    });

    return !availability.ok;
  });
  const fallbackBlocking = offendingDefinitionId
    ? installedModifications.filter(
        (modification) =>
          modification.modificationDefinitionId === offendingDefinitionId,
      )
    : [];
  const blocking = directlyBlocking.length > 0 ? directlyBlocking : fallbackBlocking;

  return Array.from(
    new Set(
      blocking.map((modification) =>
        formatModificationDefinition(modification.modificationDefinition),
      ),
    ),
  );
}

function yearForCatalogMatch(
  currentYear: number | null,
  definition: Pick<VehicleDefinitionValidationRow, "yearFrom" | "yearTo">,
) {
  if (currentYear === null) {
    return definition.yearFrom ?? null;
  }

  if (!isYearCompatible(currentYear, definition)) {
    return undefined;
  }

  return currentYear;
}

function isYearCompatible(
  year: number,
  definition: Pick<VehicleDefinitionValidationRow, "yearFrom" | "yearTo">,
) {
  return isCatalogVehicleYearAllowed(year, definition);
}

async function createAdminAuditLogsForVehicles({
  tx,
  actor,
  action,
  targetUserId,
  beforeVehicles,
  afterVehicles,
  afterForAll = {},
}: {
  tx: GarageTransaction;
  actor: GarageActorContext;
  action: string;
  targetUserId: string;
  beforeVehicles: VehicleSnapshotRow[];
  afterVehicles: VehicleSnapshotRow[];
  afterForAll?: Record<string, unknown>;
}) {
  if (actor.type !== "admin") {
    return;
  }

  const afterById = new Map(afterVehicles.map((vehicle) => [vehicle.id, vehicle]));

  for (const beforeVehicle of beforeVehicles) {
    const afterVehicle = afterById.get(beforeVehicle.id) ?? null;

    await createAdminAuditLog({
      tx,
      actor,
      action,
      targetUserId,
      vehicleIds: [beforeVehicle.id],
      before: {
        vehicle: snapshotVehicle(beforeVehicle),
      },
      after: {
        vehicle: afterVehicle ? snapshotVehicle(afterVehicle) : null,
        ...afterForAll,
      },
    });
  }
}

async function createAdminAuditLog({
  tx,
  actor,
  action,
  targetUserId,
  vehicleIds,
  before,
  after,
}: {
  tx: GarageTransaction;
  actor: GarageActorContext;
  action: string;
  targetUserId: string;
  vehicleIds: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  if (actor.type !== "admin") {
    return;
  }

  await tx.auditLog.create({
    data: {
      adminUserId: actor.adminUserId,
      action,
      before: sanitizeJson({
        targetUserId,
        vehicleIds,
        data: before,
      }),
      after: sanitizeJson({
        targetUserId,
        vehicleIds,
        data: after,
      }),
      reason: normalizeReason(actor.reason),
      ipAddress: actor.ipAddress ?? null,
    },
  });
}

function snapshotVehicle(vehicle: VehicleSnapshotRow) {
  return {
    id: vehicle.id,
    userId: vehicle.userId,
    vehicleDefinitionId: vehicle.vehicleDefinitionId,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    plateNumber: vehicle.plateNumber,
    color: vehicle.color,
    isPrimary: vehicle.isPrimary,
    hasImage: Boolean(vehicle.imagePath),
    deletedAt: isoDate(vehicle.deletedAt),
    createdAt: isoDate(vehicle.createdAt),
    updatedAt: isoDate(vehicle.updatedAt),
  };
}

function snapshotVehicleDefinition(definition: VehicleDefinitionMatchRow) {
  return {
    id: definition.id,
    code: definition.code,
    brand: definition.brand,
    model: definition.model,
    generation: definition.generation,
    chassisCode: definition.chassisCode,
    variant: definition.variant,
    yearFrom: definition.yearFrom,
    yearTo: definition.yearTo,
    powertrain: definition.powertrain,
    platformFamily: definition.platformFamily
      ? {
          code: definition.platformFamily.code,
          brand: definition.platformFamily.brand,
          name: definition.platformFamily.name,
          generation: definition.platformFamily.generation,
        }
      : null,
    engineFamily: definition.engineFamily
      ? {
          code: definition.engineFamily.code,
          manufacturer: definition.engineFamily.manufacturer,
          name: definition.engineFamily.name,
        }
      : null,
    rating: {
      power: definition.powerRating,
      handling: definition.handlingRating,
      braking: definition.brakingRating,
      reliability: definition.reliabilityRating,
      thermal: definition.thermalRating,
      trackReadiness: definition.trackReadinessRating,
      weightPenalty: definition.weightPenalty,
      status: definition.ratingStatus,
    },
  };
}

function sanitizeJson(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function normalizeReason(reason: string | null | undefined) {
  const normalized = reason?.trim();

  return normalized || null;
}

function isoDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function uniqueIds(vehicleIds: string[]) {
  return Array.from(new Set(vehicleIds.map((vehicleId) => vehicleId.trim()).filter(Boolean)));
}

function garageFailure<T extends Record<string, unknown> = Record<string, never>>(
  code: GarageServiceErrorCode,
  extras?: T,
) {
  return {
    ok: false as const,
    code,
    ...extras,
  };
}

function lifecycleNow() {
  return performance.now();
}

function lifecycleDuration(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

function logLifecycleTiming(
  label: "GARAGE_ARCHIVE_BATCH" | "GARAGE_DELETE_BATCH",
  fields: {
    userId: string;
    selectedVehicleCount?: number;
    hadPrimaryVehicle?: boolean;
    registrationRowsUnlinked?: number;
    modificationRowsDeleted?: number;
    vehicleRowsDeleted?: number;
    imageObjectCount?: number;
    durationMs: number;
    resultCode: string;
  },
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log(label, fields);
}
