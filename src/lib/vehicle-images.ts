import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
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

type OwnedVehicleImageSigningOptions = {
  accessToken?: string;
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
  return `${userId}/${vehicleId}/cover-${randomUUID()}.${vehicleImageExtensions[mimeType]}`;
}

export async function validateVehicleImageFile(
  file: File | null,
): Promise<VehicleImageValidationResult> {
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

  const detectedMimeType = await detectVehicleImageMimeType(file);

  if (detectedMimeType !== file.type) {
    return {
      ok: false,
      error: "unsupported_format",
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
  options: OwnedVehicleImageSigningOptions = {},
) {
  if (!vehicle.imagePath || vehicle.userId !== authenticatedUserId || vehicle.deletedAt) {
    return null;
  }

  const supabase = options.accessToken
    ? createAccessTokenStorageClient(options.accessToken)
    : await createOptionalSupabaseServerClient();

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

function createAccessTokenStorageClient(accessToken: string) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function isVehicleImageMimeType(value: string): value is VehicleImageMimeType {
  return vehicleImageAcceptedMimeTypes.includes(value as VehicleImageMimeType);
}

async function detectVehicleImageMimeType(file: File): Promise<VehicleImageMimeType | null> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }

    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return "image/png";
    }

    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "image/webp";
    }
  } catch {
    return null;
  }

  return null;
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
