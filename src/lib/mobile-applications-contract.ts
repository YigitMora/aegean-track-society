import { Prisma } from "@prisma/client";
import {
  mobileAuthErrorResponse,
  mobileJsonResponse,
  MobileAuthError,
} from "@/lib/mobile-auth";

export const mobileApplicationsContractHeader = "X-ATS-Applications-Contract";
export const mobileApplicationsContractVersion = "applications-v1";

export type MobileEventEligibilityReason =
  | "EVENT_NOT_PUBLISHED"
  | "REGISTRATION_NOT_OPEN"
  | "REGISTRATION_DEADLINE_PASSED"
  | "CAPACITY_REACHED"
  | "PROFILE_INCOMPLETE"
  | "REQUIRED_CONSENTS_INCOMPLETE"
  | "NO_ACTIVE_VEHICLE"
  | "EXISTING_APPLICATION"
  | "EVENT_UNAVAILABLE"
  | "UNKNOWN_EVENT_STATE";

export type MobileApplicationsErrorCode =
  | "MOBILE_APPLICATIONS_INVALID_BODY"
  | "MOBILE_APPLICATIONS_EVENT_NOT_FOUND"
  | "MOBILE_APPLICATIONS_APPLICATION_NOT_FOUND"
  | "MOBILE_APPLICATIONS_EVENT_NOT_OPEN"
  | "MOBILE_APPLICATIONS_DEADLINE_PASSED"
  | "MOBILE_APPLICATIONS_CAPACITY_REACHED"
  | "MOBILE_APPLICATIONS_PROFILE_INCOMPLETE"
  | "MOBILE_APPLICATIONS_CONSENTS_INCOMPLETE"
  | "MOBILE_APPLICATIONS_VEHICLE_NOT_FOUND"
  | "MOBILE_APPLICATIONS_DUPLICATE"
  | "MOBILE_APPLICATIONS_PASS_UNAVAILABLE"
  | "MOBILE_APPLICATIONS_PAYMENT_MODE_UNAVAILABLE"
  | "MOBILE_APPLICATIONS_BACKEND_UNAVAILABLE"
  | "MOBILE_APPLICATIONS_CREATE_FAILED"
  | "MOBILE_APPLICATIONS_INTERNAL_ERROR";

const mobileApplicationsErrors = {
  MOBILE_APPLICATIONS_INVALID_BODY: {
    status: 422,
    message: "Başvuru bilgileri geçerli değil. Lütfen alanları kontrol edin.",
  },
  MOBILE_APPLICATIONS_EVENT_NOT_FOUND: {
    status: 404,
    message: "Etkinlik bulunamadı veya artık kullanılamıyor.",
  },
  MOBILE_APPLICATIONS_APPLICATION_NOT_FOUND: {
    status: 404,
    message: "Başvuru bulunamadı veya artık kullanılamıyor.",
  },
  MOBILE_APPLICATIONS_EVENT_NOT_OPEN: {
    status: 409,
    message: "Bu etkinlik için başvuru şu anda açık değil.",
  },
  MOBILE_APPLICATIONS_DEADLINE_PASSED: {
    status: 409,
    message: "Bu etkinliğin başvuru süresi sona erdi.",
  },
  MOBILE_APPLICATIONS_CAPACITY_REACHED: {
    status: 409,
    message: "Bu etkinlik paketinin kontenjanı dolu.",
  },
  MOBILE_APPLICATIONS_PROFILE_INCOMPLETE: {
    status: 409,
    message: "Başvuru için üyelik profilinizi tamamlamanız gerekiyor.",
  },
  MOBILE_APPLICATIONS_CONSENTS_INCOMPLETE: {
    status: 409,
    message: "Başvuru için zorunlu üyelik onaylarını tamamlamanız gerekiyor.",
  },
  MOBILE_APPLICATIONS_VEHICLE_NOT_FOUND: {
    status: 404,
    message: "Araç bulunamadı veya başvuru için uygun değil.",
  },
  MOBILE_APPLICATIONS_DUPLICATE: {
    status: 409,
    message: "Bu etkinlik paketi için aktif bir başvurunuz zaten var.",
  },
  MOBILE_APPLICATIONS_PASS_UNAVAILABLE: {
    status: 409,
    message: "Katılımcı kartı bu başvuru için henüz kullanılamıyor.",
  },
  MOBILE_APPLICATIONS_PAYMENT_MODE_UNAVAILABLE: {
    status: 503,
    message: "Başvuru servisi geçici olarak kullanılamıyor.",
  },
  MOBILE_APPLICATIONS_BACKEND_UNAVAILABLE: {
    status: 503,
    message: "Başvuru servisi geçici olarak kullanılamıyor.",
  },
  MOBILE_APPLICATIONS_CREATE_FAILED: {
    status: 500,
    message: "Başvuru şu anda tamamlanamadı. Lütfen tekrar deneyin.",
  },
  MOBILE_APPLICATIONS_INTERNAL_ERROR: {
    status: 500,
    message: "Başvuru bilgileri şu anda alınamadı. Lütfen tekrar deneyin.",
  },
} satisfies Record<
  MobileApplicationsErrorCode,
  { status: number; message: string }
>;

export class MobileApplicationsError extends Error {
  readonly status: number;

  constructor(readonly code: MobileApplicationsErrorCode) {
    const definition = mobileApplicationsErrors[code];
    super(definition.message);
    this.name = "MobileApplicationsError";
    this.status = definition.status;
  }
}

export function mobileApplicationsJsonResponse<TBody>(
  body: TBody,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(
    mobileApplicationsContractHeader,
    mobileApplicationsContractVersion,
  );

  return mobileJsonResponse(body, {
    ...init,
    headers,
  });
}

export function mobileApplicationsErrorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    const response = mobileAuthErrorResponse(error);
    response.headers.set(
      mobileApplicationsContractHeader,
      mobileApplicationsContractVersion,
    );
    return response;
  }

  if (error instanceof MobileApplicationsError) {
    return mobileApplicationsJsonResponse(
      {
        error: {
          code: error.code,
          message: mobileApplicationsErrors[error.code].message,
        },
      },
      { status: error.status },
    );
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022"))
  ) {
    const unavailable = new MobileApplicationsError(
      "MOBILE_APPLICATIONS_BACKEND_UNAVAILABLE",
    );
    return mobileApplicationsJsonResponse(
      {
        error: {
          code: unavailable.code,
          message: unavailable.message,
        },
      },
      { status: unavailable.status },
    );
  }

  console.error("MOBILE_APPLICATIONS_UNHANDLED_ERROR");
  const fallback = new MobileApplicationsError(
    "MOBILE_APPLICATIONS_INTERNAL_ERROR",
  );
  return mobileApplicationsJsonResponse(
    {
      error: {
        code: fallback.code,
        message: fallback.message,
      },
    },
    { status: fallback.status },
  );
}
