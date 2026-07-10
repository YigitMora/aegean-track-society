import { createOptionalSupabaseServerClient } from "@/lib/supabase/server";

export const vehicleImagesBucket = "vehicle-images";
export const maxVehicleImageBytes = 8 * 1024 * 1024;
export const vehicleImageAcceptedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const vehicleImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type VehicleImageMimeType = (typeof vehicleImageAcceptedMimeTypes)[number];

export type VehicleImageValidationError =
  | "unsupported_format"
  | "file_too_large"
  | "upload_failed";

type VehicleImageValidationResult =
  | {
      ok: true;
      mimeType: VehicleImageMimeType;
    }
  | {
      ok: false;
      error: VehicleImageValidationError;
    };

export type OwnedVehicleImageInput = {
  id: string;
  userId: string;
  imagePath: string | null;
  deletedAt: Date | null;
};

export function buildVehicleImagePath({
  userId,
  vehicleId,
  mimeType,
}: {
  userId: string;
  vehicleId: string;
  mimeType: VehicleImageMimeType;
}) {
  return `${userId}/${vehicleId}/cover.${vehicleImageExtensions[mimeType]}`;
}

export function validateVehicleImageFile(file: File | null): VehicleImageValidationResult {
  if (!file || file.size === 0) {
    return {
      ok: false,
      error: "upload_failed",
    };
  }

  if (!isVehicleImageMimeType(file.type)) {
    return {
      ok: false,
      error: "unsupported_format",
    };
  }

  if (file.size > maxVehicleImageBytes) {
    return {
      ok: false,
      error: "file_too_large",
    };
  }

  return {
    ok: true,
    mimeType: file.type,
  };
}

export async function createOwnedVehicleImageSignedUrl(
  vehicle: OwnedVehicleImageInput,
  authenticatedUserId: string,
) {
  if (!vehicle.imagePath || vehicle.userId !== authenticatedUserId || vehicle.deletedAt) {
    return null;
  }

  const supabase = await createOptionalSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(vehicleImagesBucket)
    .createSignedUrl(vehicle.imagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    console.warn("VEHICLE_IMAGE_OPERATION_FAILED", {
      userId: authenticatedUserId,
      vehicleId: vehicle.id,
      operation: "sign_read",
      errorCode: safeStorageErrorCode(error),
    });
    return null;
  }

  return data.signedUrl;
}

function isVehicleImageMimeType(value: string): value is VehicleImageMimeType {
  return vehicleImageAcceptedMimeTypes.includes(value as VehicleImageMimeType);
}

function safeStorageErrorCode(error: unknown) {
  if (!error) {
    return "UNKNOWN";
  }

  if (typeof error === "object" && "statusCode" in error) {
    return String((error as { statusCode?: unknown }).statusCode ?? "STORAGE_ERROR");
  }

  if (error instanceof Error) {
    return error.name;
  }

  return "STORAGE_ERROR";
}
