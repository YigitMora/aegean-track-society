"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCatalogMatchRequestForMember,
  recordCatalogRequestAdminNotificationResult,
} from "@/lib/catalog-match-requests";
import { sendCatalogMatchRequestAdminEmail } from "@/lib/email";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { normalizeMemberReturnTo } from "@/lib/member-auth";
import { concreteModificationRequiredMessage } from "@/lib/modification-catalog-metadata";
import { prisma } from "@/lib/prisma";
import {
  archiveGarageVehicles,
  createGarageVehicle,
  makePrimaryGarageVehicle,
  permanentlyDeleteArchivedGarageVehicles,
  restoreGarageVehicle,
  updateGarageVehicle,
} from "@/lib/garage-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  evaluateModificationBatchAvailability,
  evaluateModificationAvailability,
  evaluateModificationRemoval,
  formatModificationDefinition,
  genericEcuFallbackCodes,
  genericTurboFallbackCodes,
  hasNamedProviderEcuTuneForVehicle,
  hasNamedProviderTurboForVehicle,
  isGenericEcuFallbackDefinition,
  isGenericTurboFallbackDefinition,
  isNamedProviderTurboDefinition,
  type VehicleBuildBatchResultCode,
  type VehicleBuildResultCode,
} from "@/lib/vehicle-build-rules";
import {
  calculateProjectedVehiclePerformanceRating,
  calculateVehiclePerformanceRating,
  type VehiclePerformanceRating,
} from "@/lib/vehicle-performance-rating";
import {
  buildVehicleImagePath,
  validateVehicleImageFile,
  vehicleImagesBucket,
} from "@/lib/vehicle-images";
import type {
  GarageLifecycleActionState,
  GarageLifecycleErrorCode,
} from "@/lib/garage-lifecycle-state";
import { parseVehicleForm } from "@/lib/vehicle-validation";

type GarageError = GarageLifecycleErrorCode;

const garagePath = "/account/garage";
const maxModificationNoteLength = 280;
const maxBatchModificationDefinitions = 20;
const maxBatchVehicleLifecycleIds = 50;

export type VehicleModificationBatchActionState = {
  ok: boolean;
  code: VehicleBuildBatchResultCode | null;
  message: string | null;
  offendingDefinitionId?: string;
  insertedCount: number;
  submittedAt: number;
};

export type VehicleRatingPreviewState = {
  ok: boolean;
  code:
    | null
    | "PREVIEW_EMPTY"
    | "PREVIEW_TOO_LARGE"
    | "VEHICLE_NOT_FOUND"
    | "RATING_UNAVAILABLE"
    | "DEFINITION_NOT_FOUND"
    | "DEFINITION_INACTIVE"
    | "DEFINITION_NOT_SELECTABLE"
    | "MODIFICATION_INCOMPATIBLE"
    | "COMPONENT_SLOT_OCCUPIED"
    | "DUPLICATE_MODIFICATION"
    | "MODIFICATION_CONFLICT"
    | "MODIFICATION_REQUIREMENT_MISSING"
    | "PREVIEW_FAILED";
  message: string | null;
  currentRating: VehiclePerformanceRating | null;
  projectedRating: VehiclePerformanceRating | null;
  offendingDefinitionId?: string;
  submittedAt: number;
};

export type CatalogMatchRequestActionState = {
  ok: boolean;
  code:
    | null
    | "invalid_vehicle"
    | "vehicle_not_found"
    | "vehicle_not_active"
    | "vehicle_already_matched"
    | "request_already_open"
    | "failed";
  message: string | null;
  requestId: string | null;
  submittedAt: number;
};

export async function createVehicleAction(formData: FormData) {
  const memberUser = await requireCompleteMemberUser("/account/garage/new");
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithError("/account/garage/new", "invalid");
  }

  let redirectPath: string | null = null;

  try {
    const result = await createGarageVehicle({
      targetUserId: memberUser.id,
      input: parsed.data,
    });

    if (!result.ok) {
      if (result.code === "duplicate_plate" && result.existingVehicleId) {
        redirectPath = `${garagePath}/${result.existingVehicleId}?garage=duplicate_opened`;
      } else {
        redirectWithError("/account/garage/new", result.code);
      }
    } else {
      console.log("GARAGE_VEHICLE_CREATED", {
        userId: memberUser.id,
        vehicleId: result.vehicleId,
        operation: "create",
      });
      redirectPath = `${garagePath}/${result.vehicleId}?garage=created`;
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "create", error);
    redirectWithError("/account/garage/new", errorCodeForVehicleWrite(error, "failed"));
  }

  revalidateGarage();
  if (redirectPath) {
    revalidatePath(redirectPath);
    redirect(redirectPath);
  }

  redirectWithError("/account/garage/new", "failed");
}

export async function requestVehicleCatalogMatchAction(
  vehicleId: string,
  _state: CatalogMatchRequestActionState,
  formData: FormData,
): Promise<CatalogMatchRequestActionState> {
  const memberUser = await requireCompleteMemberUser(garagePath);
  const ipAddress = await getActionIpAddress();
  const memberNote = normalizeOptionalText(formData.get("memberNote"), 500);

  try {
    const result = await createCatalogMatchRequestForMember({
      userId: memberUser.id,
      vehicleId,
      memberNote,
      ipAddress,
    });

    if (!result.ok) {
      return catalogMatchRequestState({
        code: result.code,
        requestId: null,
      });
    }

    if (!result.created) {
      return catalogMatchRequestState({
        ok: true,
        code: "request_already_open",
        requestId: result.requestId,
      });
    }

    const emailResult = await sendCatalogMatchRequestAdminEmail(result.notification);
    await recordCatalogRequestAdminNotificationResult({
      requestId: result.requestId,
      sent: emailResult.status === "sent",
      ipAddress,
    });

    revalidateGarage();
    revalidatePath(`${garagePath}/${vehicleId}`);

    return catalogMatchRequestState({
      ok: true,
      code: null,
      requestId: result.requestId,
    });
  } catch (error) {
    logGarageFailure(memberUser.id, "catalog_match_request", error, vehicleId);

    return catalogMatchRequestState({
      code: "failed",
      requestId: null,
    });
  }
}

export async function updateVehicleAction(vehicleId: string, formData: FormData) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithError(`/account/garage/${vehicleId}`, "invalid");
  }

  try {
    const result = await updateGarageVehicle({
      targetUserId: memberUser.id,
      vehicleId,
      input: parsed.data,
    });

    if (!result.ok) {
      redirectWithError(`/account/garage/${vehicleId}`, result.code);
    }

    console.log("GARAGE_VEHICLE_UPDATED", {
      userId: memberUser.id,
      vehicleId,
      operation: "update",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "update", error, vehicleId);
    redirectWithError(
      `/account/garage/${vehicleId}`,
      errorCodeForVehicleWrite(error, "not_found"),
    );
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=updated`);
}

export async function unlinkVehicleDefinitionAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);

  try {
    const vehicle = await prisma.vehicle.updateMany({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      data: {
        vehicleDefinitionId: null,
      },
    });

    if (vehicle.count === 0) {
      redirectWithError(garagePath, "not_found");
    }

    console.log("GARAGE_VEHICLE_TEMPLATE_UNLINKED", {
      userId: memberUser.id,
      vehicleId,
      operation: "unlink_template",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "unlink_template", error, vehicleId);
    redirectWithError(`/account/garage/${vehicleId}`, "failed");
  }

  revalidateVehicleBuild(vehicleId);
  redirect(`${garagePath}/${vehicleId}?garage=platform_unlinked#platform-match`);
}

export async function makePrimaryVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const result = await makePrimaryGarageVehicle({
      targetUserId: memberUser.id,
      vehicleId,
    });

    if (!result.ok) {
      redirectWithError(garagePath, result.code);
    }

    if (result.changed) {
      console.log("GARAGE_PRIMARY_CHANGED", {
        userId: memberUser.id,
        vehicleId,
        operation: "make_primary",
      });
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "make_primary", error, vehicleId);
    redirectWithError(garagePath, errorCodeForVehicleWrite(error, "not_found"));
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=primary`);
}

export async function archiveVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const result = await archiveGarageVehicles({
      targetUserId: memberUser.id,
      vehicleIds: [vehicleId],
    });

    if (!result.ok) {
      redirectWithError(garagePath, result.code);
    }

    console.log("GARAGE_VEHICLE_ARCHIVED", {
      userId: memberUser.id,
      vehicleId,
      operation: "archive",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "archive", error, vehicleId);
    redirectWithError(garagePath, "archive_failed");
  }

  revalidatePath(garagePath);
  redirect(`${garagePath}?garage=archived`);
}

export async function restoreVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const result = await restoreGarageVehicle({
      targetUserId: memberUser.id,
      vehicleId,
    });

    if (!result.ok) {
      redirectWithError(garagePath, result.code);
    }

    console.log("GARAGE_VEHICLE_RESTORED", {
      userId: memberUser.id,
      vehicleId,
      operation: "restore",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "restore", error, vehicleId);
    redirectWithError(garagePath, errorCodeForVehicleWrite(error, "restore_conflict"));
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=restored`);
}

export async function archiveVehiclesBatchAction(formData: FormData) {
  const memberUser = await requireCompleteMemberUser(garagePath);
  const vehicleIds = normalizeVehicleIds(formData);

  if (vehicleIds.length === 0) {
    redirectWithError(garagePath, "batch_empty");
  }

  if (vehicleIds.length > maxBatchVehicleLifecycleIds) {
    redirectWithError(garagePath, "batch_too_large");
  }

  try {
    const result = await archiveGarageVehicles({
      targetUserId: memberUser.id,
      vehicleIds,
    });

    if (!result.ok) {
      redirectWithError(garagePath, result.code);
    }

    console.log("GARAGE_VEHICLES_ARCHIVED_BATCH", {
      userId: memberUser.id,
      vehicleCount: result.count,
      operation: "archive_batch",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "archive_batch", error);
    redirectWithError(garagePath, "archive_failed");
  }

  revalidatePath(garagePath);
  redirect(`${garagePath}?garage=archived_batch`);
}

export async function archiveVehiclesLifecycleAction(
  _state: GarageLifecycleActionState,
  formData: FormData,
): Promise<GarageLifecycleActionState> {
  const totalStartedAt = lifecycleNow();
  const authStartedAt = lifecycleNow();
  const memberUser = await requireCompleteMemberUser(garagePath);
  logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
    userId: memberUser.id,
    selectedVehicleCount: normalizeVehicleIds(formData).length,
    durationMs: lifecycleDuration(authStartedAt),
    resultCode: "auth_member_resolution",
  });
  const vehicleIds = normalizeVehicleIds(formData);

  if (vehicleIds.length === 0) {
    return garageLifecycleState({
      code: "batch_empty",
      operation: "archive",
      vehicleIds,
    });
  }

  if (vehicleIds.length > maxBatchVehicleLifecycleIds) {
    return garageLifecycleState({
      code: "batch_too_large",
      operation: "archive",
      vehicleIds,
    });
  }

  try {
    const result = await archiveGarageVehicles({
      targetUserId: memberUser.id,
      vehicleIds,
    });

    if (!result.ok) {
      logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
        userId: memberUser.id,
        selectedVehicleCount: vehicleIds.length,
        durationMs: lifecycleDuration(totalStartedAt),
        resultCode: result.code,
      });

      return garageLifecycleState({
        code: result.code,
        operation: "archive",
        vehicleIds,
      });
    }

    const revalidationStartedAt = lifecycleNow();
    revalidatePath(garagePath);
    logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
      userId: memberUser.id,
      selectedVehicleCount: vehicleIds.length,
      durationMs: lifecycleDuration(revalidationStartedAt),
      resultCode: "revalidation_preparation",
    });
    logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
      userId: memberUser.id,
      selectedVehicleCount: vehicleIds.length,
      hadPrimaryVehicle: result.hadPrimaryVehicle,
      durationMs: lifecycleDuration(totalStartedAt),
      resultCode: "success",
    });

    return garageLifecycleState({
      ok: true,
      operation: "archive",
      vehicleIds,
    });
  } catch (error) {
    logGarageFailure(memberUser.id, "archive_lifecycle", error);
    logLifecycleTiming("GARAGE_ARCHIVE_BATCH", {
      userId: memberUser.id,
      selectedVehicleCount: vehicleIds.length,
      durationMs: lifecycleDuration(totalStartedAt),
      resultCode: "archive_failed",
    });

    return garageLifecycleState({
      code: "archive_failed",
      operation: "archive",
      vehicleIds,
    });
  }
}

export async function permanentlyDeleteArchivedVehicleAction(
  vehicleId: string,
  formData: FormData,
) {
  await permanentlyDeleteArchivedVehicles([vehicleId], formData, "deleted");
}

export async function permanentlyDeleteArchivedVehiclesBatchAction(formData: FormData) {
  const vehicleIds = normalizeVehicleIds(formData);
  await permanentlyDeleteArchivedVehicles(vehicleIds, formData, "deleted_batch");
}

export async function permanentlyDeleteArchivedVehiclesLifecycleAction(
  _state: GarageLifecycleActionState,
  formData: FormData,
): Promise<GarageLifecycleActionState> {
  const totalStartedAt = lifecycleNow();
  const selectedVehicleIds = normalizeVehicleIds(formData);
  const authStartedAt = lifecycleNow();
  const memberUser = await requireCompleteMemberUser(garagePath);
  logLifecycleTiming("GARAGE_DELETE_BATCH", {
    userId: memberUser.id,
    selectedVehicleCount: selectedVehicleIds.length,
    durationMs: lifecycleDuration(authStartedAt),
    resultCode: "auth_member_resolution",
  });

  if (formData.get("confirmPermanentDelete") !== "yes") {
    return garageLifecycleState({
      code: "confirmation_required",
      operation: "delete",
      vehicleIds: selectedVehicleIds,
    });
  }

  if (selectedVehicleIds.length === 0) {
    return garageLifecycleState({
      code: "batch_empty",
      operation: "delete",
      vehicleIds: selectedVehicleIds,
    });
  }

  if (selectedVehicleIds.length > maxBatchVehicleLifecycleIds) {
    return garageLifecycleState({
      code: "batch_too_large",
      operation: "delete",
      vehicleIds: selectedVehicleIds,
    });
  }

  try {
    const result = await permanentlyDeleteArchivedGarageVehicles({
      targetUserId: memberUser.id,
      vehicleIds: selectedVehicleIds,
    });

    if (!result.ok) {
      logLifecycleTiming("GARAGE_DELETE_BATCH", {
        userId: memberUser.id,
        selectedVehicleCount: selectedVehicleIds.length,
        durationMs: lifecycleDuration(totalStartedAt),
        resultCode: result.code,
      });

      return garageLifecycleState({
        code: result.code,
        operation: "delete",
        vehicleIds: selectedVehicleIds,
      });
    }

    const storageStartedAt = lifecycleNow();
    await deleteVehicleImageObjects(
      result.imagePaths,
      memberUser.id,
      "permanent_delete_cleanup",
    );
    logLifecycleTiming("GARAGE_DELETE_STORAGE_CLEANUP", {
      userId: memberUser.id,
      selectedVehicleCount: selectedVehicleIds.length,
      imageObjectCount: result.imagePaths.length,
      durationMs: lifecycleDuration(storageStartedAt),
      resultCode: "success",
    });

    const revalidationStartedAt = lifecycleNow();
    revalidatePath(garagePath);
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: memberUser.id,
      selectedVehicleCount: selectedVehicleIds.length,
      durationMs: lifecycleDuration(revalidationStartedAt),
      resultCode: "revalidation_preparation",
    });
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: memberUser.id,
      selectedVehicleCount: selectedVehicleIds.length,
      registrationRowsUnlinked: result.registrationRowsUnlinked,
      modificationRowsDeleted: result.modificationRowsDeleted,
      vehicleRowsDeleted: result.vehicleRowsDeleted,
      imageObjectCount: result.imagePaths.length,
      durationMs: lifecycleDuration(totalStartedAt),
      resultCode: "success",
    });

    return garageLifecycleState({
      ok: true,
      operation: "delete",
      vehicleIds: selectedVehicleIds,
    });
  } catch (error) {
    logGarageFailure(memberUser.id, "delete_permanent_lifecycle", error);
    logLifecycleTiming("GARAGE_DELETE_BATCH", {
      userId: memberUser.id,
      selectedVehicleCount: selectedVehicleIds.length,
      durationMs: lifecycleDuration(totalStartedAt),
      resultCode: "delete_failed",
    });

    return garageLifecycleState({
      code: "delete_failed",
      operation: "delete",
      vehicleIds: selectedVehicleIds,
    });
  }
}

export async function uploadVehicleImageAction(vehicleId: string, formData: FormData) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  const fileValue = formData.get("image");
  const imageFile = fileValue instanceof File ? fileValue : null;
  const validation = await validateVehicleImageFile(imageFile);

  if (!validation.ok) {
    redirectWithError(`/account/garage/${vehicleId}`, validation.error);
  }

  if (!imageFile) {
    redirectWithError(`/account/garage/${vehicleId}`, "upload_failed");
  }

  let oldImagePath: string | null = null;
  let nextImagePath: string | null = null;

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        imagePath: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    oldImagePath = vehicle.imagePath;
    nextImagePath = buildVehicleImagePath({
      userId: memberUser.id,
      vehicleId: vehicle.id,
      mimeType: validation.mimeType,
    });

    const supabase = await createSupabaseServerClient();
    const { error: uploadError } = await supabase.storage
      .from(vehicleImagesBucket)
      .upload(nextImagePath, imageFile, {
        cacheControl: "31536000",
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      logVehicleImageFailure(memberUser.id, vehicleId, "upload", uploadError);
      redirectWithError(`/account/garage/${vehicleId}`, "upload_failed");
    }

    await prisma.vehicle.update({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      data: {
        imagePath: nextImagePath,
      },
      select: {
        id: true,
      },
    });

    if (oldImagePath && oldImagePath !== nextImagePath) {
      await deleteVehicleImageObject(oldImagePath, memberUser.id, vehicleId, "replace_cleanup");
    }

    console.log(oldImagePath ? "VEHICLE_IMAGE_REPLACED" : "VEHICLE_IMAGE_UPLOADED", {
      userId: memberUser.id,
      vehicleId,
      operation: oldImagePath ? "replace" : "upload",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (nextImagePath && oldImagePath !== nextImagePath) {
      await deleteVehicleImageObject(nextImagePath, memberUser.id, vehicleId, "upload_rollback");
    }

    logVehicleImageFailure(memberUser.id, vehicleId, "upload", error);
    redirectWithError(
      `/account/garage/${vehicleId}`,
      imageErrorForUnknownFailure(error, "upload_failed"),
    );
  }

  revalidateGarage();
  revalidatePath(`/account/garage/${vehicleId}`);
  redirect(`${garagePath}/${vehicleId}?garage=${oldImagePath ? "image_replaced" : "image_uploaded"}`);
}

export async function removeVehicleImageAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  let oldImagePath: string | null = null;

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        imagePath: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    oldImagePath = vehicle.imagePath;

    if (!oldImagePath) {
      redirect(`${garagePath}/${vehicleId}?garage=image_removed`);
    }

    await prisma.vehicle.update({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      data: {
        imagePath: null,
      },
      select: {
        id: true,
      },
    });

    await deleteVehicleImageObject(oldImagePath, memberUser.id, vehicleId, "remove_cleanup");

    console.log("VEHICLE_IMAGE_REMOVED", {
      userId: memberUser.id,
      vehicleId,
      operation: "remove",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logVehicleImageFailure(memberUser.id, vehicleId, "remove", error);
    redirectWithError(
      `/account/garage/${vehicleId}`,
      imageErrorForUnknownFailure(error, "remove_failed"),
    );
  }

  revalidateGarage();
  revalidatePath(`/account/garage/${vehicleId}`);
  redirect(`${garagePath}/${vehicleId}?garage=image_removed`);
}

export async function addVehicleModificationAction(
  vehicleId: string,
  modificationDefinitionId: string,
  formData: FormData,
) {
  const memberUser = await requireCompleteMemberUser(
    `/account/garage/${vehicleId}#build-profile`,
  );
  const returnTo = normalizeMemberReturnTo(
    formData.get("returnTo") ?? `${garagePath}/${vehicleId}#build-profile`,
  );
  const customNotes = normalizeModificationNotes(formData.get("customNotes"));
  const installedAt = parseInstalledAt(formData.get("installedAt"));

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const [vehicle, definition] = await Promise.all([
          tx.vehicle.findFirst({
            where: {
              id: vehicleId,
              userId: memberUser.id,
              deletedAt: null,
            },
            select: {
              id: true,
              userId: true,
              vehicleDefinitionId: true,
              vehicleDefinition: {
                select: {
                  powertrain: true,
                  platformFamilyId: true,
                  engineFamilyId: true,
                },
              },
              brand: true,
              model: true,
              year: true,
              deletedAt: true,
            },
          }),
          tx.modificationDefinition.findUnique({
            where: {
              id: modificationDefinitionId,
            },
            select: modificationDefinitionRuleSelect,
          }),
        ]);

        if (!vehicle) {
          return {
            ok: false as const,
            code: "VEHICLE_NOT_FOUND" as const,
            modificationDefinitionId,
          };
        }

        if (!definition) {
          return {
            ok: false as const,
            code: "MODIFICATION_NOT_FOUND" as const,
            modificationDefinitionId,
          };
        }

        const installedModifications = await tx.vehicleModification.findMany({
          where: {
            vehicleId: vehicle.id,
            deletedAt: null,
          },
          select: installedModificationLabelSelect,
        });
        const hasNamedProviderEcuTune = isGenericEcuFallbackDefinition(definition)
          ? await loadHasNamedProviderEcuTuneForVehicle(tx, vehicle)
          : false;
        const hasNamedProviderTurbo = isGenericTurboFallbackDefinition(definition)
          ? await loadHasNamedProviderTurboForVehicle(tx, vehicle)
          : false;
        const availability = evaluateModificationAvailability({
          vehicle,
          definition,
          installedModifications,
          hasNamedProviderEcuTune,
          hasNamedProviderTurbo,
        });

        if (!availability.ok) {
          return {
            ...availability,
            modificationDefinitionId: definition.id,
          };
        }

        await tx.vehicleModification.create({
          data: {
            vehicleId: vehicle.id,
            modificationDefinitionId: definition.id,
            customNotes,
            installedAt,
          },
          select: {
            id: true,
          },
        });

        return {
          ok: true as const,
          modificationDefinitionId: definition.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      logVehicleModificationRejected(
        memberUser.id,
        vehicleId,
        result.modificationDefinitionId,
        "add",
        result.code,
      );
      redirectWithError(returnTo, garageErrorForVehicleBuildCode(result.code));
    }

    console.log("VEHICLE_MODIFICATION_ADDED", {
      userId: memberUser.id,
      vehicleId,
      modificationDefinitionId: result.modificationDefinitionId,
      operation: "add",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const code = vehicleBuildCodeForWriteError(error);
    logVehicleModificationFailure(
      memberUser.id,
      vehicleId,
      modificationDefinitionId,
      "add",
      code,
    );
    redirectWithError(returnTo, garageErrorForVehicleBuildCode(code));
  }

  revalidateVehicleBuild(vehicleId);
  redirect(withBuildStatus(returnTo, "modification_added"));
}

export async function addSelectedVehicleModificationAction(
  vehicleId: string,
  formData: FormData,
) {
  const modificationDefinitionId = formData.get("modificationDefinitionId");
  const returnTo = normalizeMemberReturnTo(
    formData.get("returnTo") ?? `${garagePath}/${vehicleId}#build-profile`,
  );

  if (typeof modificationDefinitionId !== "string" || !modificationDefinitionId.trim()) {
    await requireCompleteMemberUser(returnTo);
    redirectWithError(returnTo, "modification_not_found");
  }

  await addVehicleModificationAction(vehicleId, modificationDefinitionId.trim(), formData);
}

export async function addVehicleModificationsBatchAction(
  vehicleId: string,
  _state: VehicleModificationBatchActionState,
  formData: FormData,
): Promise<VehicleModificationBatchActionState> {
  const startedAt = performance.now();
  const memberUser = await requireCompleteMemberUser(
    `/account/garage/${vehicleId}#build-profile`,
  );
  const requestedDefinitionIds = normalizeBatchDefinitionIds(formData);

  if (requestedDefinitionIds.length === 0) {
    return batchActionState("BATCH_EMPTY");
  }

  if (requestedDefinitionIds.length > maxBatchModificationDefinitions) {
    return batchActionState("BATCH_TOO_LARGE");
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const vehicle = await tx.vehicle.findFirst({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          select: {
            id: true,
            userId: true,
            vehicleDefinitionId: true,
            vehicleDefinition: {
              select: {
                powertrain: true,
                platformFamilyId: true,
                engineFamilyId: true,
              },
            },
            brand: true,
            model: true,
            year: true,
            deletedAt: true,
          },
        });

        if (!vehicle) {
          return batchActionState("VEHICLE_NOT_FOUND");
        }

        const definitions = await tx.modificationDefinition.findMany({
          where: {
            id: {
              in: requestedDefinitionIds,
            },
          },
          select: modificationDefinitionRuleSelect,
        });
        const definitionsById = new Map(
          definitions.map((definition) => [definition.id, definition]),
        );
        const missingDefinitionId = requestedDefinitionIds.find(
          (definitionId) => !definitionsById.has(definitionId),
        );

        if (missingDefinitionId) {
          return batchActionState("DEFINITION_NOT_FOUND", {
            offendingDefinitionId: missingDefinitionId,
          });
        }

        const orderedDefinitions = requestedDefinitionIds.map((definitionId) =>
          definitionsById.get(definitionId)!,
        );
        const inactiveDefinition = orderedDefinitions.find(
          (definition) => !definition.active,
        );

        if (inactiveDefinition) {
          return batchActionState("DEFINITION_INACTIVE", {
            offendingDefinitionId: inactiveDefinition.id,
          });
        }

        const installedModifications = await tx.vehicleModification.findMany({
          where: {
            vehicleId: vehicle.id,
            deletedAt: null,
          },
          select: installedModificationLabelSelect,
        });
        const hasNamedProviderEcuTune = orderedDefinitions.some(
          isGenericEcuFallbackDefinition,
        )
          ? await loadHasNamedProviderEcuTuneForVehicle(tx, vehicle)
          : false;
        const hasNamedProviderTurbo = orderedDefinitions.some(
          isGenericTurboFallbackDefinition,
        )
          ? orderedDefinitions.some(isNamedProviderTurboDefinition) ||
            (await loadHasNamedProviderTurboForVehicle(tx, vehicle))
          : false;
        const availability = evaluateModificationBatchAvailability({
          vehicle,
          definitions: orderedDefinitions,
          installedModifications,
          hasNamedProviderEcuTune,
          hasNamedProviderTurbo,
        });

        if (!availability.ok) {
          return batchActionState(availability.code, availability);
        }

        const created = await tx.vehicleModification.createMany({
          data: orderedDefinitions.map((definition) => ({
            vehicleId: vehicle.id,
            modificationDefinitionId: definition.id,
          })),
        });

        return batchActionState(null, {
          insertedCount: created.count,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    logVehicleBuildBatchResult({
      userId: memberUser.id,
      vehicleId,
      requestedCount: requestedDefinitionIds.length,
      insertedCount: result.insertedCount,
      code: result.code,
      startedAt,
    });

    if (result.ok) {
      revalidatePath(`${garagePath}/${vehicleId}`);
    }

    return result;
  } catch (error) {
    const code = vehicleBuildBatchCodeForWriteError(error);
    logVehicleBuildBatchResult({
      userId: memberUser.id,
      vehicleId,
      requestedCount: requestedDefinitionIds.length,
      insertedCount: 0,
      code,
      startedAt,
    });

    return batchActionState(code);
  }
}

export async function previewVehicleModificationsRatingAction(
  vehicleId: string,
  formData: FormData,
): Promise<VehicleRatingPreviewState> {
  const startedAt = performance.now();
  const memberUser = await requireCompleteMemberUser(
    `/account/garage/${vehicleId}#build-profile`,
  );
  const requestedDefinitionIds = normalizeBatchDefinitionIds(formData);
  const finishPreview = (state: VehicleRatingPreviewState) => {
    logVehicleBuildRatingPreview({
      userId: memberUser.id,
      vehicleId,
      queuedCount: requestedDefinitionIds.length,
      resultCode: state.code,
      startedAt,
    });

    return state;
  };

  if (requestedDefinitionIds.length === 0) {
    return finishPreview(previewState("PREVIEW_EMPTY"));
  }

  if (requestedDefinitionIds.length > maxBatchModificationDefinitions) {
    return finishPreview(previewState("PREVIEW_TOO_LARGE"));
  }

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        vehicleDefinitionId: true,
        brand: true,
        model: true,
        year: true,
        deletedAt: true,
        vehicleDefinition: {
          select: vehicleDefinitionRatingSelect,
        },
      },
    });

    if (!vehicle) {
      return finishPreview(previewState("VEHICLE_NOT_FOUND"));
    }

    const [definitions, installedModifications] = await Promise.all([
      prisma.modificationDefinition.findMany({
        where: {
          id: {
            in: requestedDefinitionIds,
          },
        },
        select: modificationDefinitionPreviewSelect,
      }),
      prisma.vehicleModification.findMany({
        where: {
          vehicleId: vehicle.id,
          deletedAt: null,
        },
        select: installedModificationPreviewSelect,
      }),
    ]);

    const definitionsById = new Map(
      definitions.map((definition) => [definition.id, definition]),
    );
    const missingDefinitionId = requestedDefinitionIds.find(
      (definitionId) => !definitionsById.has(definitionId),
    );

    if (missingDefinitionId) {
      return finishPreview(
        previewState("DEFINITION_NOT_FOUND", {
          offendingDefinitionId: missingDefinitionId,
        }),
      );
    }

    const orderedDefinitions = requestedDefinitionIds.map((definitionId) =>
      definitionsById.get(definitionId)!,
    );
    const inactiveDefinition = orderedDefinitions.find(
      (definition) => !definition.active,
    );

    if (inactiveDefinition) {
      return finishPreview(
        previewState("DEFINITION_INACTIVE", {
          offendingDefinitionId: inactiveDefinition.id,
          offendingDefinition: inactiveDefinition,
        }),
      );
    }

    const hasNamedProviderEcuTune = orderedDefinitions.some(
      isGenericEcuFallbackDefinition,
    )
      ? await loadHasNamedProviderEcuTuneForVehicle(prisma, vehicle)
      : false;
    const hasNamedProviderTurbo = orderedDefinitions.some(
      isGenericTurboFallbackDefinition,
    )
      ? orderedDefinitions.some(isNamedProviderTurboDefinition) ||
        (await loadHasNamedProviderTurboForVehicle(prisma, vehicle))
      : false;
    const availability = evaluateModificationBatchAvailability({
      vehicle,
      definitions: orderedDefinitions,
      installedModifications,
      hasNamedProviderEcuTune,
      hasNamedProviderTurbo,
    });

    if (!availability.ok) {
      const code = previewCodeForBatchCode(availability.code);

      return finishPreview(
        previewState(code, {
          ...availability,
          offendingDefinition: definitionsById.get(availability.offendingDefinitionId),
        }),
      );
    }

    const currentRating = calculateVehiclePerformanceRating({
      vehicleDefinition: vehicle.vehicleDefinition,
      installedModifications,
    });
    const projectedRating = calculateProjectedVehiclePerformanceRating({
      vehicleDefinition: vehicle.vehicleDefinition,
      installedModifications,
      proposedModifications: orderedDefinitions.map((definition) => ({
        modificationDefinitionId: definition.id,
        modificationDefinition: definition,
      })),
    });

    const state =
      currentRating && projectedRating
        ? previewState(null, {
            currentRating,
            projectedRating,
          })
        : previewState("RATING_UNAVAILABLE", {
            ok: true,
            currentRating: null,
            projectedRating: null,
          });

    return finishPreview(state);
  } catch {
    return finishPreview(previewState("PREVIEW_FAILED"));
  }
}

export async function removeVehicleModificationAction(
  vehicleId: string,
  vehicleModificationId: string,
  formData: FormData,
) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  const returnTo = normalizeMemberReturnTo(
    formData.get("returnTo") ?? `${garagePath}/${vehicleId}`,
  );

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const vehicle = await tx.vehicle.findFirst({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!vehicle) {
          return {
            ok: false as const,
            code: "VEHICLE_NOT_FOUND" as const,
            modificationDefinitionId: null,
          };
        }

        const installedModifications = await tx.vehicleModification.findMany({
          where: {
            vehicleId: vehicle.id,
            deletedAt: null,
          },
          select: installedModificationRemovalSelect,
        });
        const removingModification = installedModifications.find(
          (modification) => modification.id === vehicleModificationId,
        );

        if (!removingModification) {
          return {
            ok: false as const,
            code: "MODIFICATION_NOT_FOUND" as const,
            modificationDefinitionId: null,
          };
        }

        const removalAvailability = evaluateModificationRemoval({
          removingModification,
          installedModifications,
        });

        if (!removalAvailability.ok) {
          return {
            ...removalAvailability,
            modificationDefinitionId: removingModification.modificationDefinitionId,
          };
        }

        const removed = await tx.vehicleModification.updateMany({
          where: {
            id: vehicleModificationId,
            vehicleId: vehicle.id,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });

        if (removed.count === 0) {
          return {
            ok: false as const,
            code: "MODIFICATION_WRITE_FAILED" as const,
            modificationDefinitionId: removingModification.modificationDefinitionId,
          };
        }

        return {
          ok: true as const,
          modificationDefinitionId: removingModification.modificationDefinitionId,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      logVehicleModificationRejected(
        memberUser.id,
        vehicleId,
        result.modificationDefinitionId,
        "remove",
        result.code,
      );
      redirectWithError(returnTo, garageErrorForVehicleBuildCode(result.code));
    }

    console.log("VEHICLE_MODIFICATION_REMOVED", {
      userId: memberUser.id,
      vehicleId,
      modificationDefinitionId: result.modificationDefinitionId,
      operation: "remove",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const code = vehicleBuildCodeForWriteError(error);
    logVehicleModificationFailure(memberUser.id, vehicleId, null, "remove", code);
    redirectWithError(returnTo, garageErrorForVehicleBuildCode(code));
  }

  revalidateVehicleBuild(vehicleId);
  redirect(withBuildStatus(returnTo, "modification_removed"));
}

function revalidateGarage() {
  revalidatePath("/account");
  revalidatePath(garagePath);
}

function revalidateVehicleBuild(vehicleId: string) {
  revalidateGarage();
  revalidatePath(`${garagePath}/${vehicleId}`);
  revalidatePath(`${garagePath}/${vehicleId}/modifications`);
}

function redirectWithError(pathname: string, error: GarageError): never {
  const url = new URL(pathname, "https://ats.local");
  url.searchParams.set("garageError", error);
  url.searchParams.delete("build");

  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function normalizeBatchDefinitionIds(formData: FormData) {
  const ids = formData
    .getAll("modificationDefinitionIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

function catalogMatchRequestState({
  ok = false,
  code,
  requestId,
}: {
  ok?: boolean;
  code: CatalogMatchRequestActionState["code"];
  requestId: string | null;
}): CatalogMatchRequestActionState {
  return {
    ok,
    code,
    requestId,
    message: catalogMatchRequestMessage(code, ok),
    submittedAt: Date.now(),
  };
}

function catalogMatchRequestMessage(
  code: CatalogMatchRequestActionState["code"],
  ok: boolean,
) {
  if (ok && code === "request_already_open") {
    return "Bu araç için katalog eşleştirme talebi zaten beklemede.";
  }

  if (ok) {
    return "Talebiniz alındı. Araç bilgileri ATS ekibi tarafından incelenecek.";
  }

  if (code === "vehicle_already_matched") {
    return "Bu araç zaten ATS kataloğuyla eşleşmiş.";
  }

  if (code === "vehicle_not_active") {
    return "Arşivlenen araçlar için katalog eşleştirme talebi oluşturulamaz.";
  }

  if (code === "vehicle_not_found" || code === "invalid_vehicle") {
    return "Araç bulunamadı.";
  }

  return "Talep oluşturulamadı. Lütfen tekrar deneyin.";
}

function normalizeOptionalText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized.slice(0, maxLength) : null;
}

async function getActionIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  return ip || null;
}

function normalizeVehicleIds(formData: FormData) {
  const ids = formData
    .getAll("vehicleIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

function garageLifecycleState({
  ok = false,
  code = ok ? null : "failed",
  operation,
  vehicleIds,
}: {
  ok?: boolean;
  code?: GarageError | null;
  operation: GarageLifecycleActionState["operation"];
  vehicleIds: string[];
}): GarageLifecycleActionState {
  return {
    ok,
    code,
    message:
      code === null
        ? lifecycleSuccessMessage(operation, vehicleIds.length)
        : lifecycleErrorMessage(code),
    operation,
    vehicleIds,
    submittedAt: Date.now(),
  };
}

function lifecycleSuccessMessage(
  operation: GarageLifecycleActionState["operation"],
  count: number,
) {
  if (operation === "archive") {
    return count > 1 ? "Araçlar arşivlendi." : "Araç arşivlendi.";
  }

  if (operation === "delete") {
    return count > 1 ? "Araçlar kalıcı olarak silindi." : "Araç kalıcı olarak silindi.";
  }

  return "İşlem tamamlandı.";
}

function lifecycleErrorMessage(code: GarageError) {
  const messages: Partial<Record<GarageError, string>> = {
    active_vehicle_limit_reached:
      "Garajınızda en fazla 5 aktif araç bulunabilir. Arşivdeki aracı geri yüklemek için önce aktif araçlardan birini arşivleyin.",
    archived_vehicle_limit_reached:
      "Arşivinizde en fazla 5 araç bulunabilir. Yeni bir araç arşivlemek için arşivdeki araçlardan birini kalıcı olarak silin veya geri yükleyin.",
    batch_empty: "İşlem için en az bir araç seçin.",
    batch_too_large: "Tek seferde seçilebilecek araç sınırı aşıldı.",
    not_found: "Araç bulunamadı veya bu işlem için uygun değil.",
    archive_failed: "Araç arşivlenemedi.",
    active_delete_forbidden: "Kalıcı silme yalnızca arşivlenen araçlar için yapılabilir.",
    confirmation_required: "Kalıcı silme için onay kutusunu işaretleyin.",
    delete_failed: "Araç kalıcı olarak silinemedi.",
    failed: "İşlem tamamlanamadı.",
  };

  return messages[code] ?? "İşlem tamamlanamadı.";
}

function lifecycleNow() {
  return performance.now();
}

function lifecycleDuration(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

function logLifecycleTiming(
  label:
    | "GARAGE_ARCHIVE_BATCH"
    | "GARAGE_DELETE_BATCH"
    | "GARAGE_DELETE_STORAGE_CLEANUP",
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

async function permanentlyDeleteArchivedVehicles(
  vehicleIds: string[],
  formData: FormData,
  successStatus: "deleted" | "deleted_batch",
) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  if (formData.get("confirmPermanentDelete") !== "yes") {
    redirectWithError(garagePath, "confirmation_required");
  }

  if (vehicleIds.length === 0) {
    redirectWithError(garagePath, "batch_empty");
  }

  if (vehicleIds.length > maxBatchVehicleLifecycleIds) {
    redirectWithError(garagePath, "batch_too_large");
  }

  let imagePaths: string[] = [];

  try {
    const result = await permanentlyDeleteArchivedGarageVehicles({
      targetUserId: memberUser.id,
      vehicleIds,
    });

    if (!result.ok) {
      redirectWithError(garagePath, result.code);
    }

    imagePaths = result.imagePaths;

    console.log("GARAGE_VEHICLES_PERMANENTLY_DELETED", {
      userId: memberUser.id,
      vehicleCount: result.vehicleRowsDeleted,
      operation: successStatus === "deleted" ? "delete_permanent" : "delete_permanent_batch",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "delete_permanent", error);
    redirectWithError(garagePath, "delete_failed");
  }

  await deleteVehicleImageObjects(imagePaths, memberUser.id, "permanent_delete_cleanup");
  revalidatePath(garagePath);
  redirect(`${garagePath}?garage=${successStatus}`);
}

type BatchActionStateContext = {
  insertedCount?: number;
  offendingDefinitionId?: string;
  conflictingModification?: {
    modificationDefinition: {
      code?: string;
      brand: string | null;
      name: string;
      variant: string | null;
      componentTypeCode?: string | null;
    };
  };
  missingRequirement?: {
    options: Array<{
      requiredDefinition: {
        code?: string;
        brand: string | null;
        name: string;
        variant: string | null;
        componentTypeCode?: string | null;
      };
    }>;
  };
};

function batchActionState(
  code: VehicleBuildBatchResultCode | null,
  context: BatchActionStateContext = {},
): VehicleModificationBatchActionState {
  if (code === null) {
    const insertedCount = context.insertedCount ?? 0;

    return {
      ok: true,
      code: null,
      message: `${insertedCount} parça build profiline eklendi.`,
      offendingDefinitionId: undefined,
      insertedCount,
      submittedAt: Date.now(),
    };
  }

  return {
    ok: false,
    code,
    message: batchResultMessage(code, context),
    offendingDefinitionId: context.offendingDefinitionId,
    insertedCount: 0,
    submittedAt: Date.now(),
  };
}

function batchResultMessage(
  code: VehicleBuildBatchResultCode,
  context: BatchActionStateContext,
) {
  if (code === "BATCH_EMPTY") {
    return "Listeye en az bir parça ekleyin.";
  }

  if (code === "BATCH_TOO_LARGE") {
    return "Tek seferde en fazla 20 parça eklenebilir.";
  }

  if (code === "DEFINITION_NOT_FOUND") {
    return "Seçilen parçalardan biri katalogda bulunamadı.";
  }

  if (code === "DEFINITION_INACTIVE") {
    return "Seçilen parçalardan biri şu anda aktif değil.";
  }

  if (code === "DEFINITION_NOT_SELECTABLE") {
    return concreteModificationRequiredMessage;
  }

  if (code === "VEHICLE_NOT_FOUND") {
    return "Araç bulunamadı veya bu işlem için uygun değil.";
  }

  if (code === "DUPLICATE_MODIFICATION") {
    return "Seçilen parçalardan biri build profilinde zaten mevcut.";
  }

  if (code === "COMPONENT_SLOT_OCCUPIED") {
    const conflictingName = context.conflictingModification
      ? formatModificationDefinition(
          context.conflictingModification.modificationDefinition,
        )
      : null;

    return conflictingName
      ? `Bu araçta aynı parça tipinden zaten bir ürün bulunuyor: ${conflictingName}.`
      : "Bu araçta aynı parça tipinden zaten bir ürün bulunuyor.";
  }

  if (code === "MODIFICATION_INCOMPATIBLE") {
    return "Seçilen parçalardan biri bu araçla uyumlu değil.";
  }

  if (code === "MODIFICATION_CONFLICT") {
    const conflictingName = context.conflictingModification
      ? formatModificationDefinition(
          context.conflictingModification.modificationDefinition,
        )
      : null;

    return conflictingName
      ? `Seçim çakışıyor: ${conflictingName}`
      : "Seçilen parçalardan biri başka bir parçayla çakışıyor.";
  }

  if (code === "MODIFICATION_REQUIREMENT_MISSING") {
    const requiredNames = context.missingRequirement?.options
      .map((option) => formatModificationDefinition(option.requiredDefinition))
      .join(" veya ");

    return requiredNames
      ? `Destek parçası öneriliyor: ${requiredNames}`
      : "Bu kurulum için destekleyici parçalar öneriliyor.";
  }

  return "Parçalar toplu olarak eklenemedi. Lütfen tekrar deneyin.";
}

type VehicleRatingPreviewCode = NonNullable<VehicleRatingPreviewState["code"]>;

type PreviewStateContext = {
  ok?: boolean;
  currentRating?: VehiclePerformanceRating | null;
  projectedRating?: VehiclePerformanceRating | null;
  offendingDefinitionId?: string;
  offendingDefinition?: {
    code?: string;
    brand: string | null;
    name: string;
    variant: string | null;
    componentTypeCode?: string | null;
  };
  conflictingModification?: {
    modificationDefinition: {
      code?: string;
      brand: string | null;
      name: string;
      variant: string | null;
      componentTypeCode?: string | null;
    };
  };
  missingRequirement?: {
    options: Array<{
      requiredDefinition: {
        code?: string;
        brand: string | null;
        name: string;
        variant: string | null;
        componentTypeCode?: string | null;
      };
    }>;
  };
};

function previewState(
  code: VehicleRatingPreviewState["code"],
  context: PreviewStateContext = {},
): VehicleRatingPreviewState {
  return {
    ok: context.ok ?? code === null,
    code,
    message: previewMessage(code, context),
    currentRating: context.currentRating ?? null,
    projectedRating: context.projectedRating ?? null,
    offendingDefinitionId: context.offendingDefinitionId,
    submittedAt: Date.now(),
  };
}

function previewMessage(
  code: VehicleRatingPreviewState["code"],
  context: PreviewStateContext,
) {
  if (code === null) {
    return "Tahmini rating hesaplandı.";
  }

  if (code === "RATING_UNAVAILABLE") {
    return "Bu araç platformu için tahmini ATS Rating mevcut değil.";
  }

  if (code === "PREVIEW_EMPTY") {
    return "Tahmini rating için listeye parça ekleyin.";
  }

  if (code === "PREVIEW_TOO_LARGE") {
    return "Tek seferde en fazla 20 parça önizlenebilir.";
  }

  if (code === "VEHICLE_NOT_FOUND") {
    return "Araç bulunamadı veya bu işlem için uygun değil.";
  }

  if (code === "DEFINITION_NOT_FOUND") {
    return "Seçilen parçalardan biri katalogda bulunamadı.";
  }

  if (code === "DEFINITION_INACTIVE") {
    return `${previewDefinitionName(context)} şu anda aktif değil.`;
  }

  if (code === "DEFINITION_NOT_SELECTABLE") {
    return concreteModificationRequiredMessage;
  }

  if (code === "MODIFICATION_INCOMPATIBLE") {
    return `${previewDefinitionName(context)} bu araç platformuyla uyumlu değil.`;
  }

  if (code === "DUPLICATE_MODIFICATION") {
    return "Bu parça build profilinde zaten yüklü.";
  }

  if (code === "COMPONENT_SLOT_OCCUPIED") {
    const conflictingName = context.conflictingModification
      ? formatModificationDefinition(
          context.conflictingModification.modificationDefinition,
        )
      : null;

    return conflictingName
      ? `${previewDefinitionName(context)} için aynı parça tipi dolu: ${conflictingName}.`
      : `${previewDefinitionName(context)} için aynı parça tipi zaten dolu.`;
  }

  if (code === "MODIFICATION_CONFLICT") {
    const conflictingName = context.conflictingModification
      ? formatModificationDefinition(
          context.conflictingModification.modificationDefinition,
        )
      : null;

    return conflictingName
      ? `${previewDefinitionName(context)}, ${conflictingName} ile çakışıyor.`
      : "Seçim çakışma içeriyor.";
  }

  if (code === "MODIFICATION_REQUIREMENT_MISSING") {
    const requiredNames = context.missingRequirement?.options
      .map((option) => formatModificationDefinition(option.requiredDefinition))
      .join(" veya ");

    return requiredNames
      ? `${previewDefinitionName(context)} için ${requiredNames} öneriliyor.`
      : "Bu kurulum için destekleyici parçalar öneriliyor.";
  }

  return "Tahmini rating hesaplanamadı.";
}

function previewDefinitionName(context: PreviewStateContext) {
  return context.offendingDefinition
    ? formatModificationDefinition(context.offendingDefinition)
    : "Seçilen parça";
}

function previewCodeForBatchCode(
  code: Exclude<
    VehicleBuildBatchResultCode,
    | "BATCH_EMPTY"
    | "BATCH_TOO_LARGE"
    | "DEFINITION_NOT_FOUND"
    | "VEHICLE_NOT_FOUND"
    | "BATCH_WRITE_FAILED"
  >,
): VehicleRatingPreviewCode {
  if (code === "DEFINITION_INACTIVE") {
    return "DEFINITION_INACTIVE";
  }

  return code;
}

function vehicleBuildBatchCodeForWriteError(error: unknown): VehicleBuildBatchResultCode {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return "VEHICLE_NOT_FOUND";
    }

    if (error.code === "P2002") {
      return "DUPLICATE_MODIFICATION";
    }
  }

  return "BATCH_WRITE_FAILED";
}

function logVehicleBuildBatchResult({
  userId,
  vehicleId,
  requestedCount,
  insertedCount,
  code,
  startedAt,
}: {
  userId: string;
  vehicleId: string;
  requestedCount: number;
  insertedCount: number;
  code: VehicleBuildBatchResultCode | null;
  startedAt: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("VEHICLE_BUILD_BATCH_WRITE", {
    userId,
    vehicleId,
    requestedCount,
    insertedCount,
    code,
    durationMs: Math.round(performance.now() - startedAt),
  });
}

function logVehicleBuildRatingPreview({
  userId,
  vehicleId,
  queuedCount,
  resultCode,
  startedAt,
}: {
  userId: string;
  vehicleId: string;
  queuedCount: number;
  resultCode: VehicleRatingPreviewState["code"];
  startedAt: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("VEHICLE_BUILD_RATING_PREVIEW", {
    userId,
    vehicleId,
    queuedCount,
    resultCode,
    durationMs: Math.round(performance.now() - startedAt),
  });
}

function errorCodeForVehicleWrite(error: unknown, fallback: GarageError): GarageError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return "failed";
  }

  if (error.code === "P2025") {
    return fallback;
  }

  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(",")
      : String(error.meta?.target ?? "");

    if (
      target.includes("Vehicle_user_active_plate_key") ||
      target.includes("plateNumber")
    ) {
      return "duplicate_plate";
    }

    if (
      target.includes("Vehicle_one_active_primary_per_user") ||
      target === "userId" ||
      target.includes("userId")
    ) {
      return "primary_conflict";
    }
  }

  return fallback;
}

function logGarageFailure(
  userId: string,
  operation: string,
  error: unknown,
  vehicleId?: string,
) {
  console.warn("GARAGE_OPERATION_FAILED", {
    userId,
    vehicleId,
    operation,
    errorCode: safeErrorCode(error),
  });
}

async function deleteVehicleImageObject(
  imagePath: string,
  userId: string,
  vehicleId: string,
  operation: string,
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(vehicleImagesBucket).remove([imagePath]);

    if (error) {
      console.warn("VEHICLE_IMAGE_CLEANUP_FAILED", {
        userId,
        vehicleId,
        operation,
        errorCode: safeErrorCode(error),
      });
    }
  } catch (error) {
    console.warn("VEHICLE_IMAGE_CLEANUP_FAILED", {
      userId,
      vehicleId,
      operation,
      errorCode: safeErrorCode(error),
    });
  }
}

async function deleteVehicleImageObjects(
  imagePaths: string[],
  userId: string,
  operation: string,
) {
  const uniqueImagePaths = Array.from(new Set(imagePaths.filter(Boolean)));

  if (uniqueImagePaths.length === 0) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(vehicleImagesBucket)
      .remove(uniqueImagePaths);

    if (error) {
      console.warn("VEHICLE_IMAGE_CLEANUP_FAILED", {
        userId,
        vehicleCount: uniqueImagePaths.length,
        operation,
        errorCode: safeErrorCode(error),
      });
    }
  } catch (error) {
    console.warn("VEHICLE_IMAGE_CLEANUP_FAILED", {
      userId,
      vehicleCount: uniqueImagePaths.length,
      operation,
      errorCode: safeErrorCode(error),
    });
  }
}

function logVehicleImageFailure(
  userId: string,
  vehicleId: string,
  operation: string,
  error: unknown,
) {
  console.warn("VEHICLE_IMAGE_OPERATION_FAILED", {
    userId,
    vehicleId,
    operation,
    errorCode: safeErrorCode(error),
  });
}

function imageErrorForUnknownFailure(error: unknown, fallback: GarageError): GarageError {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return "not_found";
  }

  if (error instanceof Error && error.name === "SupabaseConfigurationError") {
    return "storage_unavailable";
  }

  return fallback;
}

const modificationDefinitionLabelSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  usageClass: true,
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

const modificationDefinitionRatingSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  trackReadinessImpact: true,
  modificationImpacts: {
    where: {
      active: true,
    },
    select: {
      vehicleDefinitionId: true,
      powerImpact: true,
      handlingImpact: true,
      brakingImpact: true,
      reliabilityImpact: true,
      thermalImpact: true,
      trackReadinessImpact: true,
      active: true,
    },
  },
} satisfies Prisma.ModificationDefinitionSelect;

const modificationDefinitionPreviewSelect = {
  ...modificationDefinitionRuleSelect,
  code: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  trackReadinessImpact: true,
  modificationImpacts: {
    where: {
      active: true,
    },
    select: {
      vehicleDefinitionId: true,
      powerImpact: true,
      handlingImpact: true,
      brakingImpact: true,
      reliabilityImpact: true,
      thermalImpact: true,
      trackReadinessImpact: true,
      active: true,
    },
  },
} satisfies Prisma.ModificationDefinitionSelect;

const vehicleDefinitionRatingSelect = {
  id: true,
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

const installedModificationLabelSelect = {
  id: true,
  modificationDefinitionId: true,
  modificationDefinition: {
    select: modificationDefinitionLabelSelect,
  },
} satisfies Prisma.VehicleModificationSelect;

const installedModificationPreviewSelect = {
  id: true,
  modificationDefinitionId: true,
  modificationDefinition: {
    select: modificationDefinitionRatingSelect,
  },
} satisfies Prisma.VehicleModificationSelect;

const installedModificationRemovalSelect = {
  id: true,
  modificationDefinitionId: true,
  modificationDefinition: {
    select: {
      ...modificationDefinitionLabelSelect,
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
    },
  },
} satisfies Prisma.VehicleModificationSelect;

async function loadHasNamedProviderEcuTuneForVehicle(
  client: Pick<Prisma.TransactionClient, "modificationDefinition">,
  vehicle: Parameters<typeof hasNamedProviderEcuTuneForVehicle>[0]["vehicle"],
) {
  const namedEcuDefinitions = await client.modificationDefinition.findMany({
    where: {
      active: true,
      code: {
        notIn: [...genericEcuFallbackCodes],
      },
      componentTypeCode: {
        in: ["ecu_software", "platform_tune_package"],
      },
    },
    select: modificationDefinitionRuleSelect,
  });

  return hasNamedProviderEcuTuneForVehicle({
    vehicle,
    definitions: namedEcuDefinitions,
  });
}

async function loadHasNamedProviderTurboForVehicle(
  client: Pick<Prisma.TransactionClient, "modificationDefinition">,
  vehicle: Parameters<typeof hasNamedProviderTurboForVehicle>[0]["vehicle"],
) {
  const namedTurboDefinitions = await client.modificationDefinition.findMany({
    where: {
      active: true,
      code: {
        notIn: [...genericTurboFallbackCodes],
      },
      componentTypeCode: {
        in: [
          "turbo_upgrade",
          "hybrid_turbo",
          "big_turbo",
          "turbocharger_upgrade",
          "twin_turbo_upgrade",
          "supercharger_upgrade",
        ],
      },
    },
    select: modificationDefinitionRuleSelect,
  });

  return hasNamedProviderTurboForVehicle({
    vehicle,
    definitions: namedTurboDefinitions,
  });
}

function normalizeModificationNotes(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized ? normalized.slice(0, maxModificationNoteLength) : null;
}

function parseInstalledAt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function garageErrorForVehicleBuildCode(code: VehicleBuildResultCode): GarageError {
  if (code === "MODIFICATION_NOT_FOUND") {
    return "modification_not_found";
  }

  if (code === "MODIFICATION_INACTIVE") {
    return "modification_inactive";
  }

  if (code === "MODIFICATION_NOT_SELECTABLE") {
    return "modification_not_selectable";
  }

  if (code === "DUPLICATE_MODIFICATION") {
    return "duplicate_modification";
  }

  if (code === "MODIFICATION_INCOMPATIBLE") {
    return "modification_incompatible";
  }

  if (code === "COMPONENT_SLOT_OCCUPIED") {
    return "component_slot_occupied";
  }

  if (code === "MODIFICATION_CONFLICT") {
    return "modification_conflict";
  }

  if (code === "MODIFICATION_REQUIREMENT_MISSING") {
    return "modification_requirement_missing";
  }

  if (code === "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM") {
    return "modification_required_by_installed_item";
  }

  return code === "VEHICLE_NOT_FOUND" ? "not_found" : "modification_write_failed";
}

function vehicleBuildCodeForWriteError(error: unknown): VehicleBuildResultCode {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "DUPLICATE_MODIFICATION";
    }

    if (error.code === "P2025") {
      return "VEHICLE_NOT_FOUND";
    }
  }

  return "MODIFICATION_WRITE_FAILED";
}

function logVehicleModificationRejected(
  userId: string,
  vehicleId: string,
  modificationDefinitionId: string | null,
  operation: string,
  code: VehicleBuildResultCode,
) {
  console.warn("VEHICLE_MODIFICATION_REJECTED", {
    userId,
    vehicleId,
    modificationDefinitionId,
    operation,
    errorCode: code,
  });
}

function logVehicleModificationFailure(
  userId: string,
  vehicleId: string,
  modificationDefinitionId: string | null,
  operation: string,
  code: VehicleBuildResultCode,
) {
  console.warn("VEHICLE_MODIFICATION_OPERATION_FAILED", {
    userId,
    vehicleId,
    modificationDefinitionId,
    operation,
    errorCode: code,
  });
}

function withBuildStatus(pathname: string, value: string) {
  const url = new URL(pathname, "https://ats.local");
  url.searchParams.set("build", value);
  url.searchParams.delete("garageError");

  return `${url.pathname}${url.search}${url.hash}`;
}

function safeErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return String((error as { statusCode?: unknown }).statusCode ?? "STORAGE_ERROR");
  }

  if (error instanceof Error) {
    return error.name;
  }

  return "UNKNOWN";
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
