import "server-only";

import type { Prisma } from "@prisma/client";
import {
  createCatalogMatchRequestForMember,
  openCatalogMatchRequestStatuses,
  recordCatalogRequestAdminNotificationResult,
} from "@/lib/catalog-match-requests";
import { sendCatalogMatchRequestAdminEmail } from "@/lib/email";
import {
  makePrimaryGarageVehicle,
  runGarageSerializableTransaction,
  updateGarageVehicle,
} from "@/lib/garage-service";
import {
  buildMobileGarageBuildResponseBody,
  buildMobileGarageImageUploadIntentResponseBody,
  buildMobileGarageMutationResponseBody,
  buildMobileGarageRatingPreviewResponseBody,
  buildMobileGarageVehicleDetailResponseBody,
  parseMobileGarageCatalogMatchBody,
  parseMobileGarageImageFinalizeBody,
  parseMobileGarageImageUploadIntentBody,
  parseMobileGarageModificationIds,
  parseMobileGarageVehicleEditBody,
  type MobileGarageBuild,
  type MobileGarageCatalogPart,
  type MobileGarageInstalledModification,
  type MobileGarageVehicleDetail,
} from "@/lib/mobile-garage-detail-contract";
import {
  MobileGarageError,
  type MobileGarageErrorCode,
  type MobileGarageRating,
} from "@/lib/mobile-garage-contract";
import { prisma } from "@/lib/prisma";
import { normalizePlateNumber } from "@/lib/registration-validation";
import {
  modificationSelectionGroupKey,
  modificationTypeGroup,
} from "@/lib/modification-presentation";
import {
  isSelectableModificationLeaf,
  missingModificationSupportGroups,
  modificationManufacturerLabel,
  modificationRecommendationGroups,
  modificationSupportAdvisoryMessage,
} from "@/lib/modification-catalog-metadata";
import {
  componentSlotKeyForDefinition,
  evaluateModificationAvailability,
  evaluateModificationBatchAvailability,
  evaluateModificationRemoval,
  formatModificationDefinition,
  hasNamedProviderEcuTuneForVehicle,
  hasNamedProviderTurboForVehicle,
  isGenericEcuFallbackDefinition,
  isGenericTurboFallbackDefinition,
  modificationCategoryLabels,
  vehicleBuildResultLabel,
  type VehicleBuildBatchResultCode,
  type VehicleBuildResultCode,
} from "@/lib/vehicle-build-rules";
import {
  calculateProjectedVehiclePerformanceRating,
  calculateVehiclePerformanceRating,
  vehicleRatingDisclaimer,
} from "@/lib/vehicle-performance-rating";
import {
  tyreProductModelLabel,
  tyreRoadUseLabel,
  tyreSurfaceIntentLabel,
  tyreTreadwearLabel,
  visibleTyreClassBadgeLabel,
  visibleTyreClassForDefinition,
  visibleTyreClassLabel,
} from "@/lib/tyre-catalog";
import { wheelProductModelLabel } from "@/lib/wheel-catalog";
import {
  buildVehicleImagePath,
  createAccessTokenStorageClient,
  createOwnedVehicleImageSignedUrl,
  maxVehicleImageBytes,
  readOwnedVehicleImageMimeType,
  validateVehicleImageFile,
  validateVehicleImageMetadata,
  vehicleImageAcceptedMimeTypes,
  vehicleImagesBucket,
} from "@/lib/vehicle-images";

const definitionLabelSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  usageClass: true,
} satisfies Prisma.ModificationDefinitionSelect;

const modificationImpactSelect = {
  vehicleDefinitionId: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  thermalImpact: true,
  trackReadinessImpact: true,
  active: true,
} satisfies Prisma.VehicleModificationImpactSelect;

const definitionRuleSelect = {
  ...definitionLabelSelect,
  active: true,
  description: true,
  sortOrder: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  trackReadinessImpact: true,
  modificationImpacts: {
    where: { active: true },
    select: modificationImpactSelect,
  },
  tuningPackageSpecification: {
    select: {
      active: true,
      confidence: true,
      sourceNote: true,
      requiredFuelNote: true,
      hardwareRequirementNote: true,
      transmissionLimitNote: true,
      coolingRecommendationNote: true,
    },
  },
  tyreSpecification: {
    select: {
      active: true,
      tyreClass: true,
      roadLegal: true,
    },
  },
  compatibilities: {
    where: { active: true },
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
    where: { active: true },
    select: {
      active: true,
      powertrain: true,
    },
  },
  requirementGroups: {
    where: { active: true },
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    select: {
      active: true,
      description: true,
      options: {
        select: {
          requiredDefinitionId: true,
          requiredDefinition: {
            select: definitionLabelSelect,
          },
        },
      },
    },
  },
  rulesAsSource: {
    where: { active: true },
    select: {
      active: true,
      targetDefinitionId: true,
      ruleType: true,
    },
  },
  rulesAsTarget: {
    where: { active: true },
    select: {
      active: true,
      sourceDefinitionId: true,
      ruleType: true,
    },
  },
} satisfies Prisma.ModificationDefinitionSelect;

const vehicleDefinitionSelect = {
  id: true,
  brand: true,
  model: true,
  generation: true,
  chassisCode: true,
  variant: true,
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
} satisfies Prisma.VehicleDefinitionSelect;

const installedModificationSelect = {
  id: true,
  modificationDefinitionId: true,
  modificationDefinition: {
    select: definitionRuleSelect,
  },
} satisfies Prisma.VehicleModificationSelect;

const ownedVehicleSelect = {
  id: true,
  userId: true,
  vehicleDefinitionId: true,
  vehicleDefinition: {
    select: vehicleDefinitionSelect,
  },
  brand: true,
  model: true,
  year: true,
  plateNumber: true,
  color: true,
  isPrimary: true,
  imagePath: true,
  deletedAt: true,
  modifications: {
    where: { deletedAt: null },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    select: installedModificationSelect,
  },
  catalogMatchRequests: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.VehicleSelect;

type OwnedVehicleRow = Prisma.VehicleGetPayload<{
  select: typeof ownedVehicleSelect;
}>;
type DefinitionRow = Prisma.ModificationDefinitionGetPayload<{
  select: typeof definitionRuleSelect;
}>;
type InstalledModificationRow = Prisma.VehicleModificationGetPayload<{
  select: typeof installedModificationSelect;
}>;

const mobileGarageBuildTransactionTimeoutMs = 15_000;

export async function getMobileGarageVehicleDetailResponseBody({
  memberUserId,
  vehicleId,
  accessToken,
}: {
  memberUserId: string;
  vehicleId: string;
  accessToken: string;
}) {
  const vehicle = await loadOwnedVehicle(memberUserId, vehicleId);
  return buildMobileGarageVehicleDetailResponseBody(
    await serializeVehicleDetail(vehicle, memberUserId, accessToken),
  );
}

export async function updateMobileGarageVehicle({
  memberUserId,
  vehicleId,
  body,
}: {
  memberUserId: string;
  vehicleId: string;
  body: unknown;
}) {
  const input = parseMobileGarageVehicleEditBody(body);

  if (!input) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const result = await updateGarageVehicle({
    targetUserId: memberUserId,
    vehicleId,
    input: { ...input, isPrimary: false },
    preservePrimary: true,
  });

  if (result.ok) {
    return buildMobileGarageMutationResponseBody(result.vehicleId);
  }

  if (result.code === "invalid") {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }
  if (result.code === "duplicate_plate") {
    throw new MobileGarageError("MOBILE_GARAGE_DUPLICATE_PLATE");
  }
  if (result.code === "incompatible_modifications_block_match") {
    throw new MobileGarageError("MOBILE_GARAGE_EDIT_BLOCKED_BY_BUILD");
  }
  if (result.code === "not_found") {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  throw new MobileGarageError("MOBILE_GARAGE_INTERNAL_ERROR");
}

export async function makePrimaryMobileGarageVehicle({
  memberUserId,
  vehicleId,
}: {
  memberUserId: string;
  vehicleId: string;
}) {
  const result = await makePrimaryGarageVehicle({
    targetUserId: memberUserId,
    vehicleId,
  });

  if (!result.ok) {
    if (result.code === "not_found") {
      throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
    }
    throw new MobileGarageError("MOBILE_GARAGE_PRIMARY_FAILED");
  }

  return buildMobileGarageMutationResponseBody(result.vehicleId);
}

export async function prepareMobileGarageVehicleImageUpload({
  memberUserId,
  vehicleId,
  accessToken,
  body,
}: {
  memberUserId: string;
  vehicleId: string;
  accessToken: string;
  body: unknown;
}) {
  const input = parseMobileGarageImageUploadIntentBody(body);
  if (!input) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const validation = validateVehicleImageMetadata(input);

  if (!validation.ok) {
    throw new MobileGarageError(imageValidationErrorCode(validation.error));
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: memberUserId, deletedAt: null },
    select: { id: true, imagePath: true },
  });

  if (!vehicle) {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  const storage = createAccessTokenStorageClient(accessToken);

  if (!storage) {
    throw new MobileGarageError("MOBILE_GARAGE_STORAGE_UNAVAILABLE");
  }

  const nextImagePath = buildVehicleImagePath({
    userId: memberUserId,
    vehicleId,
    mimeType: validation.mimeType,
  });

  try {
    const { data, error } = await storage.storage
      .from(vehicleImagesBucket)
      .createSignedUploadUrl(nextImagePath, { upsert: false });

    if (error || !data?.token || data.path !== nextImagePath) {
      throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UPLOAD_FAILED");
    }

    return buildMobileGarageImageUploadIntentResponseBody({
      objectPath: nextImagePath,
      token: data.token,
    });
  } catch (error) {
    if (error instanceof MobileGarageError) {
      throw error;
    }
    throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UPLOAD_FAILED");
  }
}

export async function finalizeMobileGarageVehicleImageUpload({
  memberUserId,
  vehicleId,
  accessToken,
  body,
}: {
  memberUserId: string;
  vehicleId: string;
  accessToken: string;
  body: unknown;
}) {
  const input = parseMobileGarageImageFinalizeBody(body);
  if (!input) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const expectedMimeType = readOwnedVehicleImageMimeType({
    objectPath: input.objectPath,
    userId: memberUserId,
    vehicleId,
  });
  if (!expectedMimeType) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: memberUserId, deletedAt: null },
    select: { id: true, imagePath: true },
  });

  if (!vehicle) {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  const storage = createAccessTokenStorageClient(accessToken);
  if (!storage) {
    throw new MobileGarageError("MOBILE_GARAGE_STORAGE_UNAVAILABLE");
  }

  const bucket = storage.storage.from(vehicleImagesBucket);
  const removeCandidateBestEffort = async () => {
    if (input.objectPath === vehicle.imagePath) {
      return;
    }
    await removeStorageObjectBestEffort({
      storage,
      objectPath: input.objectPath,
      memberUserId,
      vehicleId,
    });
  };
  let uploadedFile: Blob;
  let storedSize: number;
  try {
    const { data: info, error: infoError } = await bucket.info(input.objectPath);
    if (
      infoError ||
      !info ||
      typeof info.size !== "number" ||
      typeof info.contentType !== "string"
    ) {
      throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UPLOAD_FAILED");
    }

    const metadataValidation = validateVehicleImageMetadata({
      mimeType: info.contentType,
      fileSize: info.size,
    });
    if (!metadataValidation.ok) {
      await removeCandidateBestEffort();
      throw new MobileGarageError(
        imageValidationErrorCode(metadataValidation.error),
      );
    }
    if (metadataValidation.mimeType !== expectedMimeType) {
      await removeCandidateBestEffort();
      throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT");
    }

    storedSize = info.size;
    const { data, error } = await bucket.download(
      input.objectPath,
      {},
      { cache: "no-store" },
    );
    if (error || !data) {
      throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UPLOAD_FAILED");
    }
    uploadedFile = data;
  } catch (error) {
    if (error instanceof MobileGarageError) {
      throw error;
    }
    throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UPLOAD_FAILED");
  }

  const validation = await validateVehicleImageFile(uploadedFile);
  if (
    !validation.ok ||
    validation.mimeType !== expectedMimeType ||
    uploadedFile.size !== storedSize
  ) {
    await removeCandidateBestEffort();
    throw new MobileGarageError(
      !validation.ok
        ? imageValidationErrorCode(validation.error)
        : "MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT",
    );
  }

  const updated = await prisma.vehicle.updateMany({
    where: {
      id: vehicleId,
      userId: memberUserId,
      deletedAt: null,
      imagePath: vehicle.imagePath,
    },
    data: { imagePath: input.objectPath },
  });

  if (updated.count !== 1) {
    const alreadyFinalized = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUserId,
        deletedAt: null,
        imagePath: input.objectPath,
      },
      select: { id: true },
    });
    if (alreadyFinalized) {
      return buildMobileGarageMutationResponseBody(vehicleId);
    }

    await removeCandidateBestEffort();
    throw new MobileGarageError("MOBILE_GARAGE_IMAGE_UPLOAD_FAILED");
  }

  if (vehicle.imagePath && vehicle.imagePath !== input.objectPath) {
    await removeStorageObjectBestEffort({
      storage,
      objectPath: vehicle.imagePath,
      memberUserId,
      vehicleId,
    });
  }

  return buildMobileGarageMutationResponseBody(vehicleId);
}

export async function removeMobileGarageVehicleImage({
  memberUserId,
  vehicleId,
  accessToken,
}: {
  memberUserId: string;
  vehicleId: string;
  accessToken: string;
}) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: memberUserId, deletedAt: null },
    select: { id: true, imagePath: true },
  });

  if (!vehicle) {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  if (!vehicle.imagePath) {
    return buildMobileGarageMutationResponseBody(vehicleId);
  }

  const storage = createAccessTokenStorageClient(accessToken);

  if (!storage) {
    throw new MobileGarageError("MOBILE_GARAGE_STORAGE_UNAVAILABLE");
  }

  const updated = await prisma.vehicle.updateMany({
    where: {
      id: vehicleId,
      userId: memberUserId,
      deletedAt: null,
      imagePath: vehicle.imagePath,
    },
    data: { imagePath: null },
  });

  if (updated.count === 0) {
    throw new MobileGarageError("MOBILE_GARAGE_IMAGE_REMOVE_FAILED");
  }

  await removeStorageObjectBestEffort({
    storage,
    objectPath: vehicle.imagePath,
    memberUserId,
    vehicleId,
  });

  return buildMobileGarageMutationResponseBody(vehicleId);
}

export async function getMobileGarageBuildResponseBody({
  memberUserId,
  vehicleId,
}: {
  memberUserId: string;
  vehicleId: string;
}) {
  const vehicle = await loadOwnedVehicle(memberUserId, vehicleId);
  const catalog = vehicle.deletedAt ? [] : await loadModificationCatalog();

  return buildMobileGarageBuildResponseBody(serializeBuild(vehicle, catalog));
}

export async function previewMobileGarageBuildRating({
  memberUserId,
  vehicleId,
  body,
}: {
  memberUserId: string;
  vehicleId: string;
  body: unknown;
}) {
  const requestedDefinitionIds = parseMobileGarageModificationIds(body);

  if (!requestedDefinitionIds) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const vehicle = await loadActiveOwnedVehicle(memberUserId, vehicleId);
  const [definitions, catalog] = await Promise.all([
    loadDefinitionsByIds(requestedDefinitionIds),
    loadModificationCatalog(),
  ]);
  assertAllDefinitionsExist(requestedDefinitionIds, definitions);
  const availability = evaluateBatchAvailability(vehicle, definitions, catalog);

  if (!availability.ok) {
    throw new MobileGarageError(errorCodeForBuildResult(availability.code));
  }

  return buildMobileGarageRatingPreviewResponseBody({
    currentRating: calculateVehiclePerformanceRating({
      vehicleDefinition: vehicle.vehicleDefinition,
      installedModifications: vehicle.modifications,
    }),
    projectedRating: calculateProjectedVehiclePerformanceRating({
      vehicleDefinition: vehicle.vehicleDefinition,
      installedModifications: vehicle.modifications,
      proposedModifications: definitions.map((definition) => ({
        modificationDefinitionId: definition.id,
        modificationDefinition: definition,
      })),
    }),
  });
}

export async function addMobileGarageModifications({
  memberUserId,
  vehicleId,
  body,
}: {
  memberUserId: string;
  vehicleId: string;
  body: unknown;
}) {
  const requestedDefinitionIds = parseMobileGarageModificationIds(body);

  if (!requestedDefinitionIds) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const result = await runGarageSerializableTransaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: { id: vehicleId, userId: memberUserId, deletedAt: null },
      select: ownedVehicleSelect,
    });

    if (!vehicle) {
      return { ok: false as const, code: "VEHICLE_NOT_FOUND" as const };
    }

    const definitions = await tx.modificationDefinition.findMany({
      where: { id: { in: requestedDefinitionIds } },
      select: definitionRuleSelect,
    });
    const orderedDefinitions = orderDefinitions(requestedDefinitionIds, definitions);

    if (!orderedDefinitions) {
      return { ok: false as const, code: "DEFINITION_NOT_FOUND" as const };
    }

    const needsProviderFallbackCatalog = orderedDefinitions.some(
      (definition) =>
        isGenericEcuFallbackDefinition(definition) ||
        isGenericTurboFallbackDefinition(definition),
    );
    const catalog = needsProviderFallbackCatalog
      ? await tx.modificationDefinition.findMany({
          where: { active: true },
          select: definitionRuleSelect,
        })
      : [];

    const availability = evaluateBatchAvailability(
      vehicle,
      orderedDefinitions,
      catalog,
    );

    if (!availability.ok) {
      return availability;
    }

    const created = await tx.vehicleModification.createMany({
      data: orderedDefinitions.map((definition) => ({
        vehicleId: vehicle.id,
        modificationDefinitionId: definition.id,
      })),
    });

    return created.count === orderedDefinitions.length
      ? { ok: true as const }
      : { ok: false as const, code: "BATCH_WRITE_FAILED" as const };
  }, { timeoutMs: mobileGarageBuildTransactionTimeoutMs });

  if (!result.ok) {
    throw new MobileGarageError(errorCodeForBuildResult(result.code));
  }

  return buildMobileGarageMutationResponseBody(vehicleId);
}

export async function removeMobileGarageModification({
  memberUserId,
  vehicleId,
  modificationId,
}: {
  memberUserId: string;
  vehicleId: string;
  modificationId: string;
}) {
  const result = await runGarageSerializableTransaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: { id: vehicleId, userId: memberUserId, deletedAt: null },
      select: { id: true },
    });

    if (!vehicle) {
      return { ok: false as const, code: "VEHICLE_NOT_FOUND" as const };
    }

    const installed = await tx.vehicleModification.findMany({
      where: { vehicleId: vehicle.id, deletedAt: null },
      select: installedModificationSelect,
    });
    const removing = installed.find((item) => item.id === modificationId);

    if (!removing) {
      return { ok: false as const, code: "MODIFICATION_NOT_FOUND" as const };
    }

    const availability = evaluateModificationRemoval({
      removingModification: removing,
      installedModifications: installed,
    });

    if (!availability.ok) {
      return availability;
    }

    const removed = await tx.vehicleModification.updateMany({
      where: {
        id: modificationId,
        vehicleId: vehicle.id,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return removed.count === 1
      ? { ok: true as const }
      : { ok: false as const, code: "MODIFICATION_WRITE_FAILED" as const };
  }, { timeoutMs: mobileGarageBuildTransactionTimeoutMs });

  if (!result.ok) {
    throw new MobileGarageError(errorCodeForBuildResult(result.code));
  }

  return buildMobileGarageMutationResponseBody(vehicleId);
}

export async function requestMobileGarageCatalogMatch({
  memberUserId,
  vehicleId,
  body,
}: {
  memberUserId: string;
  vehicleId: string;
  body: unknown;
}) {
  const parsed = parseMobileGarageCatalogMatchBody(body);

  if (!parsed) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const result = await createCatalogMatchRequestForMember({
    userId: memberUserId,
    vehicleId,
    memberNote: parsed.memberNote,
  });

  if (!result.ok) {
    if (result.code === "vehicle_not_found") {
      throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
    }
    throw new MobileGarageError("MOBILE_GARAGE_CATALOG_MATCH_INVALID");
  }

  if (result.created) {
    const emailResult = await sendCatalogMatchRequestAdminEmail(result.notification);
    await recordCatalogRequestAdminNotificationResult({
      requestId: result.requestId,
      sent: emailResult.status === "sent",
    });
  }

  return buildMobileGarageMutationResponseBody(vehicleId);
}

async function loadOwnedVehicle(memberUserId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: memberUserId },
    select: ownedVehicleSelect,
  });

  if (!vehicle) {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  return vehicle;
}

async function loadActiveOwnedVehicle(memberUserId: string, vehicleId: string) {
  const vehicle = await loadOwnedVehicle(memberUserId, vehicleId);

  if (vehicle.deletedAt) {
    throw new MobileGarageError("MOBILE_GARAGE_BUILD_UNAVAILABLE");
  }

  return vehicle;
}

async function loadModificationCatalog() {
  const definitions = await prisma.modificationDefinition.findMany({
    where: { active: true },
    orderBy: [
      { category: "asc" },
      { sortOrder: "asc" },
      { name: "asc" },
      { id: "asc" },
    ],
    select: definitionRuleSelect,
  });

  return definitions.filter(isSelectableModificationLeaf);
}

async function loadDefinitionsByIds(ids: string[]) {
  const definitions = await prisma.modificationDefinition.findMany({
    where: { id: { in: ids } },
    select: definitionRuleSelect,
  });
  return orderDefinitions(ids, definitions) ?? [];
}

function assertAllDefinitionsExist(ids: string[], definitions: DefinitionRow[]) {
  if (definitions.length !== ids.length) {
    throw new MobileGarageError("MOBILE_GARAGE_MODIFICATION_NOT_FOUND");
  }
}

function orderDefinitions(ids: string[], definitions: DefinitionRow[]) {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const ordered = ids.map((id) => byId.get(id));
  return ordered.every(Boolean) ? (ordered as DefinitionRow[]) : null;
}

function evaluateBatchAvailability(
  vehicle: OwnedVehicleRow,
  definitions: DefinitionRow[],
  catalog: DefinitionRow[],
) {
  return evaluateModificationBatchAvailability({
    vehicle,
    definitions,
    installedModifications: vehicle.modifications,
    hasNamedProviderEcuTune: definitions.some(isGenericEcuFallbackDefinition)
      ? hasNamedProviderEcuTuneForVehicle({ vehicle, definitions: catalog })
      : false,
    hasNamedProviderTurbo: definitions.some(isGenericTurboFallbackDefinition)
      ? hasNamedProviderTurboForVehicle({ vehicle, definitions: catalog })
      : false,
  });
}

async function serializeVehicleDetail(
  vehicle: OwnedVehicleRow,
  memberUserId: string,
  accessToken: string,
): Promise<MobileGarageVehicleDetail> {
  const archived = Boolean(vehicle.deletedAt);
  const latestCatalogStatus = vehicle.catalogMatchRequests[0]?.status ?? null;
  const openCatalogRequest = latestCatalogStatus
    ? openCatalogMatchRequestStatuses.some(
        (status) => status === latestCatalogStatus,
      )
    : false;

  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    plateNumber: normalizePlateNumber(vehicle.plateNumber) ?? vehicle.plateNumber,
    color: vehicle.color,
    isPrimary: vehicle.isPrimary,
    archived,
    coverImageUrl: archived
      ? null
      : await createOwnedVehicleImageSignedUrl(vehicle, memberUserId, {
          accessToken,
        }),
    image: {
      hasImage: Boolean(vehicle.imagePath),
      acceptedMimeTypes: vehicleImageAcceptedMimeTypes,
      maxBytes: maxVehicleImageBytes,
    },
    vehicleDefinition: vehicle.vehicleDefinition
      ? {
          id: vehicle.vehicleDefinition.id,
          brand: vehicle.vehicleDefinition.brand,
          model: vehicle.vehicleDefinition.model,
          generation: vehicle.vehicleDefinition.generation,
          chassisCode: vehicle.vehicleDefinition.chassisCode,
          variant: vehicle.vehicleDefinition.variant,
          ratingStatus: vehicle.vehicleDefinition.ratingStatus,
        }
      : null,
    catalogMatch: {
      latestStatus: latestCatalogStatus,
      canRequest:
        !archived && !vehicle.vehicleDefinitionId && !openCatalogRequest,
    },
    rating: calculateVehiclePerformanceRating({
      vehicleDefinition: vehicle.vehicleDefinition,
      installedModifications: vehicle.modifications,
    }),
    ratingDisclosure: vehicleRatingDisclaimer,
    modifications: serializeInstalledModifications(vehicle.modifications),
    actions: {
      canEdit: !archived,
      canSetPrimary: !archived && !vehicle.isPrimary,
      canManageImage: !archived,
      canManageBuild: !archived,
      canRequestCatalogMatch:
        !archived && !vehicle.vehicleDefinitionId && !openCatalogRequest,
      canRestore: archived,
      canPermanentlyDelete: archived,
    },
  };
}

function serializeBuild(
  vehicle: OwnedVehicleRow,
  catalog: DefinitionRow[],
): MobileGarageBuild {
  const installedIds = new Set(
    vehicle.modifications.map((item) => item.modificationDefinitionId),
  );
  const hasNamedProviderEcu = hasNamedProviderEcuTuneForVehicle({
    vehicle,
    definitions: catalog,
  });
  const hasNamedProviderTurbo = hasNamedProviderTurboForVehicle({
    vehicle,
    definitions: catalog,
  });
  const visibleCatalog = catalog.filter(
    (definition) =>
      !(isGenericEcuFallbackDefinition(definition) && hasNamedProviderEcu) &&
      !(isGenericTurboFallbackDefinition(definition) && hasNamedProviderTurbo),
  );
  const definitionsByCode = new Map(
    visibleCatalog.map((definition) => [definition.code, definition]),
  );

  return {
    vehicleId: vehicle.id,
    archived: Boolean(vehicle.deletedAt),
    currentRating: calculateVehiclePerformanceRating({
      vehicleDefinition: vehicle.vehicleDefinition,
      installedModifications: vehicle.modifications,
    }),
    installed: serializeInstalledModifications(vehicle.modifications),
    catalog: visibleCatalog.map((definition) =>
      serializeCatalogPart({
        vehicle,
        definition,
        installedIds,
        hasNamedProviderEcu,
        hasNamedProviderTurbo,
        definitionsByCode,
      }),
    ),
  };
}

function serializeInstalledModifications(
  installed: InstalledModificationRow[],
): MobileGarageInstalledModification[] {
  return installed.map((item) => {
    const availability = evaluateModificationRemoval({
      removingModification: item,
      installedModifications: installed,
    });

    return {
      id: item.id,
      category: item.modificationDefinition.category,
      categoryLabel: modificationCategoryLabels[item.modificationDefinition.category],
      label: formatModificationDefinition(item.modificationDefinition),
      removal: availability.ok
        ? { allowed: true, reasonCode: null, reason: null }
        : {
            allowed: false,
            reasonCode: availability.code,
            reason: vehicleBuildResultLabel(availability.code, availability),
          },
    };
  });
}

function serializeCatalogPart({
  vehicle,
  definition,
  installedIds,
  hasNamedProviderEcu,
  hasNamedProviderTurbo,
  definitionsByCode,
}: {
  vehicle: OwnedVehicleRow;
  definition: DefinitionRow;
  installedIds: Set<string>;
  hasNamedProviderEcu: boolean;
  hasNamedProviderTurbo: boolean;
  definitionsByCode: Map<string, DefinitionRow>;
}): MobileGarageCatalogPart {
  const availability = evaluateModificationAvailability({
    vehicle,
    definition,
    installedModifications: vehicle.modifications,
    hasNamedProviderEcuTune: hasNamedProviderEcu,
    hasNamedProviderTurbo,
  });
  const unknown =
    !vehicle.vehicleDefinitionId &&
    !availability.ok &&
    availability.code === "MODIFICATION_INCOMPATIBLE" &&
    (definition.compatibilities.length > 0 ||
      definition.powertrainApplicabilities.length > 0);
  const status = installedIds.has(definition.id)
    ? "INSTALLED"
    : unknown
      ? "UNKNOWN"
      : availability.ok
        ? "AVAILABLE"
        : availability.code === "MODIFICATION_INCOMPATIBLE"
          ? "INCOMPATIBLE"
          : "BLOCKED";
  const reasonCode = installedIds.has(definition.id)
    ? "DUPLICATE_MODIFICATION"
    : unknown
      ? "COMPATIBILITY_UNKNOWN"
      : availability.code;
  const reason = installedIds.has(definition.id)
    ? "Bu parça build profiline zaten eklenmiş."
    : unknown
      ? "Araç platformu doğrulanmadan uyumluluk kesinleştirilemiyor."
      : availability.ok
        ? null
        : vehicleBuildResultLabel(availability.code, availability);
  const tuning = definition.tuningPackageSpecification;
  const visibleTyreClass = visibleTyreClassForDefinition(definition);
  const missingSupportGroups = missingModificationSupportGroups(
    definition,
    installedIds,
  );

  return {
    id: definition.id,
    category: definition.category,
    categoryLabel: modificationCategoryLabels[definition.category],
    group: modificationTypeGroup(definition),
    manufacturer: {
      key: modificationManufacturerLabel(definition),
      label: modificationManufacturerLabel(definition),
    },
    selectionGroupKey: modificationSelectionGroupKey(
      definition,
      componentSlotKeyForDefinition(definition),
    ),
    label:
      definition.category === "TYRES"
        ? tyreProductModelLabel(definition)
        : definition.category === "WHEELS"
          ? wheelProductModelLabel(definition)
        : formatModificationDefinition(definition),
    brand: definition.brand,
    name: definition.name,
    variant: definition.variant,
    description: definition.description,
    tyre:
      visibleTyreClass && definition.tyreSpecification?.active
        ? {
            classLabel:
              visibleTyreClassLabel(visibleTyreClass) ?? "Lastik",
            badgeLabel:
              visibleTyreClassBadgeLabel(visibleTyreClass) ?? "Lastik",
            roadUseLabel: tyreRoadUseLabel(definition),
            surfaceIntentLabel: tyreSurfaceIntentLabel(definition),
            treadwearLabel: tyreTreadwearLabel(definition),
          }
        : null,
    status,
    reasonCode,
    reason,
    conflictingModification:
      availability.ok || !("conflictingModification" in availability) ||
      !availability.conflictingModification
        ? null
        : {
            label: formatModificationDefinition(
              availability.conflictingModification.modificationDefinition,
            ),
          },
    requirements: definition.requirementGroups.map((group) => ({
      description: group.description,
      options: group.options.map((option) => ({
        label: formatModificationDefinition(option.requiredDefinition),
      })),
    })),
    recommendations: modificationRecommendationGroups(definition.code).map(
      (group) => ({
        description: group.description,
        options: group.optionCodes.flatMap((optionCode) => {
          const recommendedDefinition = definitionsByCode.get(optionCode);

          return recommendedDefinition
            ? [{ label: formatModificationDefinition(recommendedDefinition) }]
            : [];
        }),
      }),
    ),
    supportAdvisory:
      definition.requirementGroups.length > 0
        ? {
            message: modificationSupportAdvisoryMessage,
            missing: missingSupportGroups.length > 0,
          }
        : null,
    calibration: {
      confidence: tuning?.active ? tuning.confidence : null,
      sourceNote: tuning?.active ? tuning.sourceNote : null,
      fuelRequirement: tuning?.active ? tuning.requiredFuelNote : null,
      hardwareRequirement: tuning?.active
        ? tuning.hardwareRequirementNote
        : null,
      transmissionRequirement: tuning?.active
        ? tuning.transmissionLimitNote
        : null,
      coolingRecommendation: tuning?.active
        ? tuning.coolingRecommendationNote
        : null,
      provisional:
        vehicle.vehicleDefinition?.ratingStatus !== "CALIBRATED" ||
        Boolean(tuning?.active && tuning.confidence !== "HIGH"),
    },
  };
}

function imageValidationErrorCode(
  code: "unsupported_format" | "file_too_large" | "upload_failed",
): MobileGarageErrorCode {
  if (code === "unsupported_format") {
    return "MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT";
  }
  if (code === "file_too_large") {
    return "MOBILE_GARAGE_IMAGE_TOO_LARGE";
  }
  return "MOBILE_GARAGE_IMAGE_UPLOAD_FAILED";
}

function errorCodeForBuildResult(
  code: VehicleBuildResultCode | VehicleBuildBatchResultCode,
): MobileGarageErrorCode {
  if (code === "VEHICLE_NOT_FOUND") {
    return "MOBILE_GARAGE_VEHICLE_NOT_FOUND";
  }
  if (code === "MODIFICATION_NOT_FOUND" || code === "DEFINITION_NOT_FOUND") {
    return "MOBILE_GARAGE_MODIFICATION_NOT_FOUND";
  }
  if (code === "MODIFICATION_INACTIVE" || code === "DEFINITION_INACTIVE") {
    return "MOBILE_GARAGE_MODIFICATION_INACTIVE";
  }
  if (
    code === "MODIFICATION_NOT_SELECTABLE" ||
    code === "DEFINITION_NOT_SELECTABLE"
  ) {
    return "MOBILE_GARAGE_MODIFICATION_NOT_SELECTABLE";
  }
  if (code === "DUPLICATE_MODIFICATION") {
    return "MOBILE_GARAGE_MODIFICATION_DUPLICATE";
  }
  if (code === "COMPONENT_SLOT_OCCUPIED") {
    return "MOBILE_GARAGE_MODIFICATION_SLOT_OCCUPIED";
  }
  if (code === "MODIFICATION_INCOMPATIBLE") {
    return "MOBILE_GARAGE_MODIFICATION_INCOMPATIBLE";
  }
  if (code === "MODIFICATION_CONFLICT") {
    return "MOBILE_GARAGE_MODIFICATION_CONFLICT";
  }
  if (code === "MODIFICATION_REQUIREMENT_MISSING") {
    return "MOBILE_GARAGE_MODIFICATION_REQUIREMENT_MISSING";
  }
  if (code === "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM") {
    return "MOBILE_GARAGE_MODIFICATION_REQUIRED_BY_BUILD";
  }
  return "MOBILE_GARAGE_MODIFICATION_FAILED";
}

async function removeStorageObjectBestEffort({
  storage,
  objectPath,
  memberUserId,
  vehicleId,
}: {
  storage: NonNullable<ReturnType<typeof createAccessTokenStorageClient>>;
  objectPath: string;
  memberUserId: string;
  vehicleId: string;
}) {
  if (!objectPath.startsWith(`${memberUserId}/${vehicleId}/`)) {
    console.warn("MOBILE_GARAGE_IMAGE_CLEANUP_REJECTED");
    return;
  }

  try {
    const { error } = await storage.storage
      .from(vehicleImagesBucket)
      .remove([objectPath]);

    if (error) {
      console.warn("MOBILE_GARAGE_IMAGE_CLEANUP_FAILED");
    }
  } catch {
    console.warn("MOBILE_GARAGE_IMAGE_CLEANUP_FAILED");
  }
}
