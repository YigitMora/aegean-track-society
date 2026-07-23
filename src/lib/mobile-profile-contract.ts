import { Prisma } from "@prisma/client";
import {
  mobileAuthErrorResponse,
  mobileAuthJsonResponse,
  MobileAuthError,
} from "@/lib/mobile-auth";
import {
  parseMemberProfileForm,
  type MemberProfileInput,
} from "@/lib/member-profile-validation";

export const mobileProfileContractHeader = "X-ATS-Profile-Contract";
export const mobileProfileContractVersion = "profile-v1";

export type MobileProfileErrorCode =
  | "MOBILE_PROFILE_INVALID_BODY"
  | "MOBILE_PROFILE_BACKEND_UNAVAILABLE"
  | "MOBILE_PROFILE_UPDATE_FAILED";

const mobileProfileErrors = {
  MOBILE_PROFILE_INVALID_BODY: {
    status: 422,
    message: "Profil bilgileri geçerli değil. Lütfen alanları kontrol edin.",
  },
  MOBILE_PROFILE_BACKEND_UNAVAILABLE: {
    status: 503,
    message: "Profil servisi geçici olarak kullanılamıyor.",
  },
  MOBILE_PROFILE_UPDATE_FAILED: {
    status: 500,
    message: "Profil şu anda güncellenemedi. Lütfen tekrar deneyin.",
  },
} satisfies Record<
  MobileProfileErrorCode,
  { status: number; message: string }
>;

export class MobileProfileError extends Error {
  readonly status: number;

  constructor(readonly code: MobileProfileErrorCode) {
    const definition = mobileProfileErrors[code];
    super(definition.message);
    this.name = "MobileProfileError";
    this.status = definition.status;
  }
}

export function parseMobileProfileUpdateBody(
  value: unknown,
  options: { requireMissingConsents: boolean },
): {
  data: MemberProfileInput;
  acceptedMissingConsents: boolean;
} | null {
  if (!isPlainObject(value) || !hasExactFields(value, profileUpdateFields)) {
    return null;
  }

  if (
    typeof value.fullName !== "string" ||
    typeof value.phone !== "string" ||
    (value.displayName !== null && typeof value.displayName !== "string") ||
    typeof value.memberKvkkAccepted !== "boolean" ||
    typeof value.memberTermsAccepted !== "boolean" ||
    typeof value.memberMarketingConsent !== "boolean"
  ) {
    return null;
  }

  const formData = new FormData();
  formData.set("fullName", value.fullName);
  formData.set("phone", value.phone);
  if (value.displayName !== null) {
    formData.set("displayName", value.displayName);
  }
  if (value.memberMarketingConsent) {
    formData.set("memberMarketingConsent", "on");
  }
  if (value.memberKvkkAccepted) {
    formData.set("memberKvkkAccepted", "on");
  }
  if (value.memberTermsAccepted) {
    formData.set("memberTermsAccepted", "on");
  }

  const parsed = parseMemberProfileForm(formData, {
    requireMissingConsents: options.requireMissingConsents,
  });
  return parsed.ok
    ? {
        data: parsed.data,
        acceptedMissingConsents: parsed.acceptedMissingConsents,
      }
    : null;
}

export function mobileProfileJsonResponse<TBody>(
  body: TBody,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(mobileProfileContractHeader, mobileProfileContractVersion);
  return mobileAuthJsonResponse(body, { ...init, headers });
}

export function mobileProfileErrorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    const response = mobileAuthErrorResponse(error);
    response.headers.set(
      mobileProfileContractHeader,
      mobileProfileContractVersion,
    );
    return response;
  }

  if (error instanceof MobileProfileError) {
    return mobileProfileJsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2021", "P2022"].includes(error.code))
  ) {
    return mobileProfileErrorResponse(
      new MobileProfileError("MOBILE_PROFILE_BACKEND_UNAVAILABLE"),
    );
  }

  console.error("MOBILE_PROFILE_UNHANDLED_ERROR");
  return mobileProfileErrorResponse(
    new MobileProfileError("MOBILE_PROFILE_UPDATE_FAILED"),
  );
}

const profileUpdateFields = [
  "displayName",
  "fullName",
  "memberKvkkAccepted",
  "memberMarketingConsent",
  "memberTermsAccepted",
  "phone",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype,
  );
}

function hasExactFields(
  value: Record<string, unknown>,
  expectedFields: readonly string[],
) {
  const fields = Object.keys(value).sort();
  return (
    fields.length === expectedFields.length &&
    fields.every((field, index) => field === expectedFields[index])
  );
}
