import type {
  ModificationCategory,
  VehicleCatalogMatchRequestStatus,
  VehicleRatingStatus,
} from "@prisma/client";
import { parseVehicleForm, type VehicleInput } from "@/lib/vehicle-validation";
import {
  mobileGarageErrorResponse,
  mobileGarageLifecycleContractHeader,
  mobileGarageLifecycleContractVersion,
  type MobileGarageRating,
} from "@/lib/mobile-garage-contract";
import { mobileJsonResponse } from "@/lib/mobile-auth";

export const mobileGarageDetailContractHeader = "X-ATS-Garage-Detail-Contract";
export const mobileGarageDetailContractVersion = "build-v1";
export const mobileGarageMaxModificationBatch = 20;

export type MobileGarageVehicleDefinitionSummary = {
  id: string;
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
  ratingStatus: VehicleRatingStatus;
};

export type MobileGarageInstalledModification = {
  id: string;
  category: ModificationCategory;
  categoryLabel: string;
  label: string;
  removal: {
    allowed: boolean;
    reasonCode: string | null;
    reason: string | null;
  };
};

export type MobileGarageVehicleDetail = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  color: string | null;
  isPrimary: boolean;
  archived: boolean;
  coverImageUrl: string | null;
  image: {
    hasImage: boolean;
    acceptedMimeTypes: readonly string[];
    maxBytes: number;
  };
  vehicleDefinition: MobileGarageVehicleDefinitionSummary | null;
  catalogMatch: {
    latestStatus: VehicleCatalogMatchRequestStatus | null;
    canRequest: boolean;
  };
  rating: MobileGarageRating | null;
  ratingDisclosure: string;
  modifications: MobileGarageInstalledModification[];
  actions: {
    canEdit: boolean;
    canSetPrimary: boolean;
    canManageImage: boolean;
    canManageBuild: boolean;
    canRequestCatalogMatch: boolean;
    canRestore: boolean;
    canPermanentlyDelete: boolean;
  };
};

export type MobileGarageCatalogPartStatus =
  | "AVAILABLE"
  | "INSTALLED"
  | "BLOCKED"
  | "INCOMPATIBLE"
  | "UNKNOWN";

export type MobileGarageCatalogPart = {
  id: string;
  category: ModificationCategory;
  categoryLabel: string;
  group: {
    key: string;
    label: string;
  };
  manufacturer: {
    key: string;
    label: string;
  };
  selectionGroupKey: string | null;
  label: string;
  brand: string | null;
  name: string;
  variant: string | null;
  description: string | null;
  tyre: {
    classLabel: string;
    badgeLabel: string;
    roadUseLabel: string;
    surfaceIntentLabel: string;
    treadwearLabel: string | null;
  } | null;
  status: MobileGarageCatalogPartStatus;
  reasonCode: string | null;
  reason: string | null;
  conflictingModification: {
    label: string;
  } | null;
  requirements: Array<{
    description: string | null;
    options: Array<{ label: string }>;
  }>;
  recommendations: Array<{
    description: string;
    options: Array<{ label: string }>;
  }>;
  supportAdvisory: {
    message: string;
    missing: boolean;
  } | null;
  calibration: {
    confidence: string | null;
    sourceNote: string | null;
    fuelRequirement: string | null;
    hardwareRequirement: string | null;
    transmissionRequirement: string | null;
    coolingRecommendation: string | null;
    provisional: boolean;
  };
};

export type MobileGarageBuild = {
  vehicleId: string;
  archived: boolean;
  currentRating: MobileGarageRating | null;
  installed: MobileGarageInstalledModification[];
  catalog: MobileGarageCatalogPart[];
};

export function buildMobileGarageVehicleDetailResponseBody(
  vehicle: MobileGarageVehicleDetail,
) {
  return {
    data: {
      vehicle: {
        ...vehicle,
        rating: serializeMobileGarageRating(vehicle.rating),
      },
    },
  };
}

export function buildMobileGarageBuildResponseBody(build: MobileGarageBuild) {
  return {
    data: {
      build: {
        ...build,
        currentRating: serializeMobileGarageRating(build.currentRating),
      },
    },
  };
}

export function buildMobileGarageRatingPreviewResponseBody({
  currentRating,
  projectedRating,
}: {
  currentRating: MobileGarageRating | null;
  projectedRating: MobileGarageRating | null;
}) {
  return {
    data: {
      currentRating: serializeMobileGarageRating(currentRating),
      projectedRating: serializeMobileGarageRating(projectedRating),
    },
  };
}

function serializeMobileGarageRating(
  rating: MobileGarageRating | null,
): MobileGarageRating | null {
  if (!rating) {
    return null;
  }

  return {
    overall: rating.overall,
    power: rating.power,
    handling: rating.handling,
    braking: rating.braking,
    reliability: rating.reliability,
    thermal: rating.thermal,
    trackReadiness: rating.trackReadiness,
    status: rating.status,
  };
}

export function buildMobileGarageMutationResponseBody(vehicleId: string) {
  return { data: { vehicleId } };
}

export function buildMobileGarageModificationRemovalResponseBody({
  vehicleId,
  requestedCount,
  updatedCount,
}: {
  vehicleId: string;
  requestedCount: number;
  updatedCount: number;
}) {
  return { data: { vehicleId, requestedCount, updatedCount } };
}

export function buildMobileGarageImageUploadIntentResponseBody({
  objectPath,
  token,
}: {
  objectPath: string;
  token: string;
}) {
  return { data: { upload: { objectPath, token } } };
}

export function mobileGarageDetailJsonResponse<TBody>(
  body: TBody,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(
    mobileGarageDetailContractHeader,
    mobileGarageDetailContractVersion,
  );
  headers.set(
    mobileGarageLifecycleContractHeader,
    mobileGarageLifecycleContractVersion,
  );
  return mobileJsonResponse(body, { ...init, headers });
}

export function mobileGarageDetailErrorResponse(error: unknown) {
  const response = mobileGarageErrorResponse(error);
  response.headers.set(
    mobileGarageDetailContractHeader,
    mobileGarageDetailContractVersion,
  );
  return response;
}

export function parseMobileGarageVehicleEditBody(
  value: unknown,
): Omit<VehicleInput, "isPrimary"> | null {
  if (!isPlainObject(value) || !hasExactFields(value, vehicleEditFields)) {
    return null;
  }

  const { vehicleDefinitionId, brand, model, year, plateNumber, color } = value;
  if (
    (vehicleDefinitionId !== null && typeof vehicleDefinitionId !== "string") ||
    typeof brand !== "string" ||
    typeof model !== "string" ||
    (year !== null && (typeof year !== "number" || !Number.isInteger(year))) ||
    typeof plateNumber !== "string" ||
    (color !== null && typeof color !== "string")
  ) {
    return null;
  }

  const formData = new FormData();
  formData.set("vehicleDefinitionId", vehicleDefinitionId ?? "");
  formData.set("brand", brand);
  formData.set("model", model);
  formData.set("year", year === null ? "" : String(year));
  formData.set("plateNumber", plateNumber);
  formData.set("color", color ?? "");
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    return null;
  }

  const { isPrimary: _ignored, ...input } = parsed.data;
  return input;
}

export function parseMobileGarageModificationIds(value: unknown) {
  if (!isPlainObject(value) || !hasExactFields(value, modificationFields)) {
    return null;
  }

  const ids = value.modificationDefinitionIds;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > mobileGarageMaxModificationBatch ||
    ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 128)
  ) {
    return null;
  }

  const normalizedIds = ids.map((id) => (id as string).trim());
  return new Set(normalizedIds).size === normalizedIds.length
    ? normalizedIds
    : null;
}

export function parseMobileGarageInstalledModificationIds(value: unknown) {
  if (!isPlainObject(value) || !hasExactFields(value, installedModificationFields)) {
    return null;
  }

  const ids = value.modificationIds;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > mobileGarageMaxModificationBatch ||
    ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 128)
  ) {
    return null;
  }

  const normalizedIds = ids.map((id) => (id as string).trim());
  return new Set(normalizedIds).size === normalizedIds.length
    ? normalizedIds
    : null;
}

export function parseMobileGarageCatalogMatchBody(value: unknown) {
  if (!isPlainObject(value) || !hasExactFields(value, catalogMatchFields)) {
    return null;
  }

  if (value.memberNote !== null && typeof value.memberNote !== "string") {
    return null;
  }

  const memberNote =
    typeof value.memberNote === "string"
      ? value.memberNote.trim().replace(/\s+/g, " ")
      : null;
  if (memberNote && memberNote.length > 500) {
    return null;
  }

  return { memberNote: memberNote || null };
}

export function parseMobileGarageImageUploadIntentBody(value: unknown) {
  if (!isPlainObject(value) || !hasExactFields(value, imageUploadIntentFields)) {
    return null;
  }

  if (
    typeof value.mimeType !== "string" ||
    value.mimeType.length === 0 ||
    value.mimeType.length > 100 ||
    typeof value.fileSize !== "number" ||
    !Number.isInteger(value.fileSize) ||
    value.fileSize <= 0
  ) {
    return null;
  }

  return { mimeType: value.mimeType, fileSize: value.fileSize };
}

export function parseMobileGarageImageFinalizeBody(value: unknown) {
  if (!isPlainObject(value) || !hasExactFields(value, imageFinalizeFields)) {
    return null;
  }

  if (
    typeof value.objectPath !== "string" ||
    value.objectPath.length === 0 ||
    value.objectPath.length > 512 ||
    value.objectPath.trim() !== value.objectPath
  ) {
    return null;
  }

  return { objectPath: value.objectPath };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactFields(
  value: Record<string, unknown>,
  expectedFields: ReadonlySet<string>,
) {
  const fields = Object.keys(value);
  return (
    fields.length === expectedFields.size &&
    fields.every((field) => expectedFields.has(field))
  );
}

const vehicleEditFields = new Set([
  "vehicleDefinitionId",
  "brand",
  "model",
  "year",
  "plateNumber",
  "color",
]);
const modificationFields = new Set(["modificationDefinitionIds"]);
const installedModificationFields = new Set(["modificationIds"]);
const catalogMatchFields = new Set(["memberNote"]);
const imageUploadIntentFields = new Set(["mimeType", "fileSize"]);
const imageFinalizeFields = new Set(["objectPath"]);
