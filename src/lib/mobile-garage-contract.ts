import type {
  VehicleCatalogMatchRequestStatus,
  VehicleDrivetrain,
  VehiclePowertrain,
  VehicleRatingStatus,
} from "@prisma/client";
import {
  authenticateMobileMember,
  mobileAuthErrorResponse,
  mobileJsonResponse,
  MobileAuthError,
} from "@/lib/mobile-auth";
import {
  parseVehicleForm,
  type VehicleInput,
} from "@/lib/vehicle-validation";

export type MobileGarageRating = {
  overall: number;
  power: number;
  handling: number;
  braking: number;
  reliability: number;
  thermal: number;
  trackReadiness: number;
  status: VehicleRatingStatus;
};

export type MobileGarageVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  color: string | null;
  isPrimary: boolean;
  coverImageUrl: string | null;
  vehicleDefinitionId: string | null;
  modificationCount: number;
  latestCatalogMatchRequestStatus: VehicleCatalogMatchRequestStatus | null;
  atsRating: MobileGarageRating | null;
};

export type MobileGarageArchivedVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  modificationCount: number;
};

export type MobileVehicleDefinition = {
  id: string;
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  powertrain: VehiclePowertrain;
  drivetrain: VehicleDrivetrain;
  ratingStatus: VehicleRatingStatus;
};

export type MobileGarageErrorCode =
  | "MOBILE_GARAGE_CONTRACT_UNSUPPORTED"
  | "MOBILE_GARAGE_INVALID_BODY"
  | "MOBILE_GARAGE_DUPLICATE_PLATE"
  | "MOBILE_GARAGE_CAPACITY_REACHED"
  | "MOBILE_GARAGE_ARCHIVED_CAPACITY_REACHED"
  | "MOBILE_GARAGE_VEHICLE_NOT_FOUND"
  | "MOBILE_GARAGE_ARCHIVE_FAILED"
  | "MOBILE_GARAGE_RESTORE_CONFLICT"
  | "MOBILE_GARAGE_RESTORE_FAILED"
  | "MOBILE_GARAGE_ACTIVE_DELETE_FORBIDDEN"
  | "MOBILE_GARAGE_DELETE_CONFIRMATION_REQUIRED"
  | "MOBILE_GARAGE_DELETE_FAILED"
  | "MOBILE_GARAGE_EDIT_BLOCKED_BY_BUILD"
  | "MOBILE_GARAGE_PRIMARY_FAILED"
  | "MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT"
  | "MOBILE_GARAGE_IMAGE_TOO_LARGE"
  | "MOBILE_GARAGE_IMAGE_UPLOAD_FAILED"
  | "MOBILE_GARAGE_IMAGE_REMOVE_FAILED"
  | "MOBILE_GARAGE_STORAGE_UNAVAILABLE"
  | "MOBILE_GARAGE_BUILD_UNAVAILABLE"
  | "MOBILE_GARAGE_MODIFICATION_NOT_FOUND"
  | "MOBILE_GARAGE_MODIFICATION_INACTIVE"
  | "MOBILE_GARAGE_MODIFICATION_DUPLICATE"
  | "MOBILE_GARAGE_MODIFICATION_SLOT_OCCUPIED"
  | "MOBILE_GARAGE_MODIFICATION_INCOMPATIBLE"
  | "MOBILE_GARAGE_MODIFICATION_CONFLICT"
  | "MOBILE_GARAGE_MODIFICATION_REQUIREMENT_MISSING"
  | "MOBILE_GARAGE_MODIFICATION_REQUIRED_BY_BUILD"
  | "MOBILE_GARAGE_MODIFICATION_FAILED"
  | "MOBILE_GARAGE_RATING_PREVIEW_FAILED"
  | "MOBILE_GARAGE_CATALOG_MATCH_INVALID"
  | "MOBILE_GARAGE_CATALOG_MATCH_ALREADY_OPEN"
  | "MOBILE_GARAGE_CATALOG_MATCH_FAILED"
  | "MOBILE_GARAGE_CREATE_FAILED"
  | "MOBILE_GARAGE_INTERNAL_ERROR";

export const mobileGaragePermanentDeleteConfirmation = "PERMANENT_DELETE";
export const mobileGarageLifecycleContractHeader = "X-ATS-Garage-Contract";
export const mobileGarageLifecycleContractVersion = "lifecycle-v1";

const mobileGarageErrors = {
  MOBILE_GARAGE_CONTRACT_UNSUPPORTED: {
    status: 426,
    message: "Uygulama sürümü garaj işlemleri için güncellenmelidir.",
  },
  MOBILE_GARAGE_INVALID_BODY: {
    status: 422,
    message: "Araç bilgileri geçerli değil. Lütfen alanları kontrol edin.",
  },
  MOBILE_GARAGE_DUPLICATE_PLATE: {
    status: 409,
    message: "Bu plaka ile aktif bir araç garajınızda zaten bulunuyor.",
  },
  MOBILE_GARAGE_CAPACITY_REACHED: {
    status: 409,
    message: "Garajınızdaki aktif araç kapasitesi dolu.",
  },
  MOBILE_GARAGE_ARCHIVED_CAPACITY_REACHED: {
    status: 409,
    message: "Arşivinizdeki araç kapasitesi dolu.",
  },
  MOBILE_GARAGE_VEHICLE_NOT_FOUND: {
    status: 404,
    message: "Araç bulunamadı veya bu işlem için uygun değil.",
  },
  MOBILE_GARAGE_ARCHIVE_FAILED: {
    status: 409,
    message: "Araç arşivlenemedi. Garajı yenileyip tekrar deneyin.",
  },
  MOBILE_GARAGE_RESTORE_CONFLICT: {
    status: 409,
    message: "Aynı plakaya sahip aktif bir araç bulunduğu için araç geri yüklenemedi.",
  },
  MOBILE_GARAGE_RESTORE_FAILED: {
    status: 500,
    message: "Araç şu anda geri yüklenemedi. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_ACTIVE_DELETE_FORBIDDEN: {
    status: 409,
    message: "Kalıcı silme yalnızca arşivlenen araçlar için yapılabilir.",
  },
  MOBILE_GARAGE_DELETE_CONFIRMATION_REQUIRED: {
    status: 422,
    message: "Kalıcı silme için açık onay gerekiyor.",
  },
  MOBILE_GARAGE_DELETE_FAILED: {
    status: 500,
    message: "Araç şu anda kalıcı olarak silinemedi. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_EDIT_BLOCKED_BY_BUILD: {
    status: 409,
    message: "Bu kimlik değişikliği yüklü modifikasyonlarla uyumlu değil.",
  },
  MOBILE_GARAGE_PRIMARY_FAILED: {
    status: 500,
    message: "Ana araç şu anda değiştirilemedi. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT: {
    status: 422,
    message: "Yalnız JPEG, PNG veya WebP araç fotoğrafı seçebilirsiniz.",
  },
  MOBILE_GARAGE_IMAGE_TOO_LARGE: {
    status: 413,
    message: "Araç fotoğrafı en fazla 8 MB olabilir.",
  },
  MOBILE_GARAGE_IMAGE_UPLOAD_FAILED: {
    status: 503,
    message: "Araç fotoğrafı şu anda yüklenemedi. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_IMAGE_REMOVE_FAILED: {
    status: 503,
    message: "Araç fotoğrafı şu anda kaldırılamadı. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_STORAGE_UNAVAILABLE: {
    status: 503,
    message: "Görsel servisi geçici olarak kullanılamıyor.",
  },
  MOBILE_GARAGE_BUILD_UNAVAILABLE: {
    status: 409,
    message: "Build işlemleri bu araç için kullanılamıyor.",
  },
  MOBILE_GARAGE_MODIFICATION_NOT_FOUND: {
    status: 404,
    message: "Parça bulunamadı veya bu işlem için uygun değil.",
  },
  MOBILE_GARAGE_MODIFICATION_INACTIVE: {
    status: 409,
    message: "Bu parça şu anda build profiline eklenemez.",
  },
  MOBILE_GARAGE_MODIFICATION_DUPLICATE: {
    status: 409,
    message: "Bu parça build profiline zaten eklenmiş.",
  },
  MOBILE_GARAGE_MODIFICATION_SLOT_OCCUPIED: {
    status: 409,
    message: "Bu parça tipi için ayrılan slot dolu.",
  },
  MOBILE_GARAGE_MODIFICATION_INCOMPATIBLE: {
    status: 409,
    message: "Bu parça araçla uyumlu değil.",
  },
  MOBILE_GARAGE_MODIFICATION_CONFLICT: {
    status: 409,
    message: "Bu parça yüklü başka bir parçayla çakışıyor.",
  },
  MOBILE_GARAGE_MODIFICATION_REQUIREMENT_MISSING: {
    status: 409,
    message: "Bu parça için gerekli destekleyici parça yüklü değil.",
  },
  MOBILE_GARAGE_MODIFICATION_REQUIRED_BY_BUILD: {
    status: 409,
    message: "Bu parça build profilindeki başka bir parça tarafından gerekli.",
  },
  MOBILE_GARAGE_MODIFICATION_FAILED: {
    status: 500,
    message: "Build profili şu anda güncellenemedi. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_RATING_PREVIEW_FAILED: {
    status: 500,
    message: "Tahmini ATS Rating şu anda hesaplanamadı.",
  },
  MOBILE_GARAGE_CATALOG_MATCH_INVALID: {
    status: 409,
    message: "Bu araç için katalog eşleştirme talebi oluşturulamıyor.",
  },
  MOBILE_GARAGE_CATALOG_MATCH_ALREADY_OPEN: {
    status: 409,
    message: "Bu araç için açık bir katalog eşleştirme talebi zaten var.",
  },
  MOBILE_GARAGE_CATALOG_MATCH_FAILED: {
    status: 500,
    message: "Katalog eşleştirme talebi şu anda oluşturulamadı.",
  },
  MOBILE_GARAGE_CREATE_FAILED: {
    status: 500,
    message: "Araç şu anda eklenemedi. Lütfen tekrar deneyin.",
  },
  MOBILE_GARAGE_INTERNAL_ERROR: {
    status: 500,
    message: "Garaj bilgileri şu anda alınamadı. Lütfen tekrar deneyin.",
  },
} satisfies Record<
  MobileGarageErrorCode,
  { status: number; message: string }
>;

export class MobileGarageError extends Error {
  readonly status: number;

  constructor(readonly code: MobileGarageErrorCode) {
    const definition = mobileGarageErrors[code];
    super(definition.message);
    this.name = "MobileGarageError";
    this.status = definition.status;
  }
}

export function buildMobileGarageResponseBody({
  active,
  max,
  remaining,
  vehicles,
  archive,
}: {
  active: number;
  max: number;
  remaining: number;
  vehicles: MobileGarageVehicle[];
  archive?: {
    archived: number;
    max: number;
    remaining: number;
    vehicles: MobileGarageArchivedVehicle[];
  };
}) {
  return {
    data: {
      capacity: {
        active,
        max,
        remaining,
      },
      vehicles,
      ...(archive
        ? {
            archivedCapacity: {
              archived: archive.archived,
              max: archive.max,
              remaining: archive.remaining,
            },
            archivedVehicles: archive.vehicles,
          }
        : {}),
    },
  };
}

export function buildMobileVehicleDefinitionsResponseBody(
  vehicleDefinitions: MobileVehicleDefinition[],
) {
  return {
    data: {
      vehicleDefinitions,
    },
  };
}

export function buildMobileGarageCreateResponseBody(vehicleId: string) {
  return {
    data: {
      vehicleId,
    },
  };
}

export function parseMobileGarageVehicleBody(value: unknown): VehicleInput | null {
  if (!isPlainObject(value) || !hasOnlyVehicleCreateFields(value)) {
    return null;
  }

  const {
    vehicleDefinitionId,
    brand,
    model,
    year,
    plateNumber,
    color,
    isPrimary,
  } = value;

  if (
    (vehicleDefinitionId !== null && typeof vehicleDefinitionId !== "string") ||
    typeof brand !== "string" ||
    typeof model !== "string" ||
    (year !== null && (!Number.isInteger(year) || typeof year !== "number")) ||
    typeof plateNumber !== "string" ||
    (color !== null && typeof color !== "string") ||
    typeof isPrimary !== "boolean"
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
  if (isPrimary) {
    formData.set("isPrimary", "on");
  }

  const parsed = parseVehicleForm(formData);

  return parsed.ok ? parsed.data : null;
}

export function hasMobileGaragePermanentDeleteConfirmation(value: unknown) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    value.confirmation === mobileGaragePermanentDeleteConfirmation
  );
}

export async function authenticateMobileGarageMember(request: Request) {
  const authenticated = await authenticateMobileMember(request);
  if (
    request.headers.get(mobileGarageLifecycleContractHeader) !==
    mobileGarageLifecycleContractVersion
  ) {
    throw new MobileGarageError("MOBILE_GARAGE_CONTRACT_UNSUPPORTED");
  }
  return authenticated;
}

export function mobileGarageJsonResponse<TBody>(
  body: TBody,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(
    mobileGarageLifecycleContractHeader,
    mobileGarageLifecycleContractVersion,
  );

  return mobileJsonResponse(body, {
    ...init,
    headers,
  });
}

export function mobileGarageErrorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    const response = mobileAuthErrorResponse(error);
    response.headers.set(
      mobileGarageLifecycleContractHeader,
      mobileGarageLifecycleContractVersion,
    );
    return response;
  }

  if (error instanceof MobileGarageError) {
    return mobileGarageJsonResponse(
      {
        error: {
          code: error.code,
          message: mobileGarageErrors[error.code].message,
        },
      },
      { status: error.status },
    );
  }

  console.error("MOBILE_GARAGE_UNHANDLED_ERROR");

  const fallback = new MobileGarageError("MOBILE_GARAGE_INTERNAL_ERROR");
  return mobileGarageErrorResponse(fallback);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyVehicleCreateFields(value: Record<string, unknown>) {
  const expectedFields = new Set([
    "vehicleDefinitionId",
    "brand",
    "model",
    "year",
    "plateNumber",
    "color",
    "isPrimary",
  ]);
  const fields = Object.keys(value);

  return (
    fields.length === expectedFields.size &&
    fields.every((field) => expectedFields.has(field))
  );
}
