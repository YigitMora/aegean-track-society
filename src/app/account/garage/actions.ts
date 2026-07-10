"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { normalizeMemberReturnTo } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildVehicleImagePath,
  validateVehicleImageFile,
  vehicleImagesBucket,
} from "@/lib/vehicle-images";
import { parseVehicleForm } from "@/lib/vehicle-validation";

type GarageError =
  | "invalid"
  | "duplicate_plate"
  | "not_found"
  | "archive_failed"
  | "restore_conflict"
  | "primary_conflict"
  | "unsupported_format"
  | "file_too_large"
  | "storage_unavailable"
  | "upload_failed"
  | "remove_failed"
  | "failed";

const garagePath = "/account/garage";

export async function createVehicleAction(formData: FormData) {
  const memberUser = await requireCompleteMemberUser("/account/garage/new");
  const returnTo = normalizeMemberReturnTo(formData.get("returnTo"));
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithError("/account/garage/new", "invalid");
  }

  try {
    const duplicateVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        plateNumber: parsed.data.plateNumber,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicateVehicle) {
      redirectWithError("/account/garage/new", "duplicate_plate");
    }

    const activePrimaryCount = await prisma.vehicle.count({
      where: {
        userId: memberUser.id,
        deletedAt: null,
        isPrimary: true,
      },
    });
    const shouldBecomePrimary = parsed.data.isPrimary || activePrimaryCount === 0;

    const vehicleData = {
      userId: memberUser.id,
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      plateNumber: parsed.data.plateNumber,
      color: parsed.data.color,
      isPrimary: shouldBecomePrimary,
    };

    const vehicle = shouldBecomePrimary
      ? (
          await prisma.$transaction([
            prisma.vehicle.updateMany({
              where: {
                userId: memberUser.id,
                deletedAt: null,
                isPrimary: true,
              },
              data: {
                isPrimary: false,
              },
            }),
            prisma.vehicle.create({
              data: vehicleData,
              select: {
                id: true,
              },
            }),
          ])
        )[1]
      : await prisma.vehicle.create({
          data: vehicleData,
          select: {
            id: true,
          },
        });

    console.log("GARAGE_VEHICLE_CREATED", {
      userId: memberUser.id,
      vehicleId: vehicle.id,
      operation: "create",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "create", error);
    redirectWithError("/account/garage/new", errorCodeForVehicleWrite(error, "duplicate_plate"));
  }

  revalidateGarage();
  revalidatePath(returnTo);

  if (returnTo !== garagePath) {
    redirect(returnTo);
  }

  redirect(`${garagePath}?garage=created`);
}

export async function updateVehicleAction(vehicleId: string, formData: FormData) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithError(`/account/garage/${vehicleId}`, "invalid");
  }

  try {
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!existingVehicle) {
      redirectWithError(garagePath, "not_found");
    }

    const duplicateVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        plateNumber: parsed.data.plateNumber,
        deletedAt: null,
        id: {
          not: vehicleId,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateVehicle) {
      redirectWithError(`/account/garage/${vehicleId}`, "duplicate_plate");
    }

    const updateData = {
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      plateNumber: parsed.data.plateNumber,
      color: parsed.data.color,
    };

    if (parsed.data.isPrimary && !existingVehicle.isPrimary) {
      await prisma.$transaction([
        prisma.vehicle.updateMany({
          where: {
            userId: memberUser.id,
            deletedAt: null,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        }),
        prisma.vehicle.update({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          data: {
            ...updateData,
            isPrimary: true,
          },
          select: {
            id: true,
          },
        }),
      ]);
    } else {
      await prisma.vehicle.update({
        where: {
          id: vehicleId,
          userId: memberUser.id,
          deletedAt: null,
        },
        data: updateData,
        select: {
          id: true,
        },
      });
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

export async function makePrimaryVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    if (!vehicle.isPrimary) {
      await prisma.$transaction([
        prisma.vehicle.updateMany({
          where: {
            userId: memberUser.id,
            deletedAt: null,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        }),
        prisma.vehicle.update({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          data: {
            isPrimary: true,
          },
          select: {
            id: true,
          },
        }),
      ]);

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
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    const now = new Date();

    if (vehicle.isPrimary) {
      const nextPrimaryVehicle = await prisma.vehicle.findFirst({
        where: {
          userId: memberUser.id,
          deletedAt: null,
          id: {
            not: vehicleId,
          },
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

      const operations = [
        prisma.vehicle.update({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          data: {
            deletedAt: now,
            isPrimary: false,
          },
          select: {
            id: true,
          },
        }),
      ];

      if (nextPrimaryVehicle) {
        operations.push(
          prisma.vehicle.update({
            where: {
              id: nextPrimaryVehicle.id,
              userId: memberUser.id,
              deletedAt: null,
            },
            data: {
              isPrimary: true,
            },
            select: {
              id: true,
            },
          }),
        );
      }

      await prisma.$transaction(operations);
    } else {
      await prisma.vehicle.update({
        where: {
          id: vehicleId,
          userId: memberUser.id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          isPrimary: false,
        },
        select: {
          id: true,
        },
      });
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

  revalidateGarage();
  redirect(`${garagePath}?garage=archived`);
}

export async function restoreVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        plateNumber: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    const duplicateVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        plateNumber: vehicle.plateNumber,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicateVehicle) {
      redirectWithError(garagePath, "restore_conflict");
    }

    const activePrimaryVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        deletedAt: null,
        isPrimary: true,
      },
      select: {
        id: true,
      },
    });

    const restoredVehicle = await prisma.vehicle.updateMany({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: {
          not: null,
        },
      },
      data: {
        deletedAt: null,
        isPrimary: !activePrimaryVehicle,
      },
    });

    if (restoredVehicle.count === 0) {
      redirectWithError(garagePath, "not_found");
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

export async function uploadVehicleImageAction(vehicleId: string, formData: FormData) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  const fileValue = formData.get("image");
  const imageFile = fileValue instanceof File ? fileValue : null;
  const validation = validateVehicleImageFile(imageFile);

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
        upsert: true,
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

function revalidateGarage() {
  revalidatePath("/account");
  revalidatePath(garagePath);
}

function redirectWithError(pathname: string, error: GarageError): never {
  redirect(`${pathname}?garageError=${error}`);
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
