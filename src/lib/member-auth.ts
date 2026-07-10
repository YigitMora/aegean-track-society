import { Prisma } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { normalizeEmail, normalizeTurkishPhone } from "@/lib/registration-validation";
import { prisma } from "@/lib/prisma";
import { createOptionalSupabaseServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxReturnToLength = 2048;
const normalizedTurkishMobileRegex = /^\+90 5\d{2} \d{3} \d{2} \d{2}$/;
const signupMetadataKeys = {
  fullName: "atsFullName",
  phone: "atsPhone",
  memberKvkkAcceptedAt: "atsMemberKvkkAcceptedAt",
  memberTermsAcceptedAt: "atsMemberTermsAcceptedAt",
  memberMarketingConsentAt: "atsMemberMarketingConsentAt",
  memberConsentIpAddress: "atsMemberConsentIpAddress",
} as const;

const memberUserInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
});

export type AtsMemberUser = Prisma.UserGetPayload<{
  include: typeof memberUserInclude;
}>;

type MemberSignupMetadataInput = {
  fullName: string | null;
  phone: string | null;
  memberKvkkAcceptedAt: Date | null;
  memberTermsAcceptedAt: Date | null;
  memberMarketingConsentAt: Date | null;
  memberConsentIpAddress: string | null;
};

export type RequiredMemberSignupMetadataInput = {
  fullName: string;
  phone: string;
  memberKvkkAcceptedAt: Date;
  memberTermsAcceptedAt: Date;
  memberMarketingConsentAt: Date | null;
  memberConsentIpAddress: string | null;
};

class MemberAuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "MemberAuthError";
  }
}

export async function getOptionalAuthenticatedMemberIdentity() {
  const supabase = await createOptionalSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: normalizeEmail(data.user.email),
  };
}

export async function getVerifiedSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function ensureMemberUser(supabaseUser?: SupabaseUser | null) {
  const user = supabaseUser ?? (await getVerifiedSupabaseUser());

  if (!user) {
    throw new MemberAuthError("UNAUTHENTICATED", "No authenticated Supabase user.");
  }

  if (!uuidRegex.test(user.id)) {
    throw new MemberAuthError("INVALID_USER_ID", "Supabase user id is not a valid UUID.");
  }

  if (!user.email || !isEmailVerified(user)) {
    throw new MemberAuthError("EMAIL_NOT_VERIFIED", "Supabase user email is not verified.");
  }

  const email = normalizeEmail(user.email);
  const signupMetadata = parseSignupMetadata(user);

  try {
    const memberUser = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          memberKvkkAcceptedAt: true,
          memberTermsAcceptedAt: true,
          memberMarketingConsentAt: true,
          memberConsentIpAddress: true,
        },
      });

      await tx.user.upsert({
        where: {
          id: user.id,
        },
        update: {
          email,
          ...consentUpdateForExistingUser(existingUser, signupMetadata),
        },
        create: {
          id: user.id,
          email,
          memberKvkkAcceptedAt: signupMetadata.memberKvkkAcceptedAt,
          memberTermsAcceptedAt: signupMetadata.memberTermsAcceptedAt,
          memberMarketingConsentAt: signupMetadata.memberMarketingConsentAt,
          memberConsentIpAddress: signupMetadata.memberConsentIpAddress,
        },
      });

      const existingProfile = await tx.memberProfile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingProfile) {
        await tx.memberProfile.create({
          data: {
            userId: user.id,
            fullName: signupMetadata.fullName,
            phone: signupMetadata.phone,
            profileCompletedAt:
              signupMetadata.fullName &&
              signupMetadata.phone &&
              signupMetadata.memberKvkkAcceptedAt &&
              signupMetadata.memberTermsAcceptedAt
                ? new Date()
                : null,
          },
        });
      }

      return tx.user.findUnique({
        where: {
          id: user.id,
        },
        include: memberUserInclude,
      });
    });

    if (!memberUser) {
      throw new MemberAuthError("PROVISIONING_FAILED", "ATS member user was not found.");
    }

    console.log("AUTH_USER_PROVISIONED", {
      userId: user.id,
    });

    return memberUser;
  } catch (error) {
    if (error instanceof MemberAuthError) {
      throw error;
    }

    console.error("AUTH_USER_PROVISION_FAILED", serializeAuthError(error));
    throw new MemberAuthError("PROVISIONING_FAILED", "ATS member provisioning failed.");
  }
}

export const requireMemberUser = cache(async (returnTo = "/account") => {
  const supabaseUser = await getVerifiedSupabaseUser();

  if (!supabaseUser) {
    redirect(
      `/auth/login?returnTo=${encodeURIComponent(normalizeMemberReturnTo(returnTo))}`,
    );
  }

  const memberUser = await ensureMemberUser(supabaseUser);

  if (memberUser.status !== "ACTIVE" || memberUser.deletedAt) {
    redirect("/auth/login?error=account_unavailable");
  }

  return memberUser;
});

export function normalizeMemberReturnTo(value: FormDataEntryValue | string | null | undefined) {
  const returnTo = typeof value === "string" ? value.trim() : "";

  if (
    !returnTo ||
    returnTo.length > maxReturnToLength ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    hasUnsafeScheme(returnTo)
  ) {
    return "/account";
  }

  if (isAllowedMemberReturnPath(returnTo)) {
    return returnTo;
  }

  return "/account";
}

export function buildMemberSignupMetadata(input: RequiredMemberSignupMetadataInput) {
  return {
    [signupMetadataKeys.fullName]: input.fullName,
    [signupMetadataKeys.phone]: input.phone,
    [signupMetadataKeys.memberKvkkAcceptedAt]: input.memberKvkkAcceptedAt.toISOString(),
    [signupMetadataKeys.memberTermsAcceptedAt]: input.memberTermsAcceptedAt.toISOString(),
    [signupMetadataKeys.memberMarketingConsentAt]:
      input.memberMarketingConsentAt?.toISOString() ?? null,
    [signupMetadataKeys.memberConsentIpAddress]: input.memberConsentIpAddress,
  };
}

function isAllowedMemberReturnPath(returnTo: string) {
  return (
    returnTo === "/" ||
    returnTo === "/account" ||
    returnTo.startsWith("/account/") ||
    returnTo === "/auth/reset-password" ||
    returnTo.startsWith("/events/") && returnTo.endsWith("/register")
  );
}

function hasUnsafeScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function isEmailVerified(user: SupabaseUser) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function parseSignupMetadata(user: SupabaseUser): MemberSignupMetadataInput {
  const metadata = user.user_metadata as Record<string, unknown>;

  return {
    fullName: normalizeMetadataText(metadata[signupMetadataKeys.fullName]),
    phone: normalizeMetadataPhone(metadata[signupMetadataKeys.phone]),
    memberKvkkAcceptedAt: optionalDateFromMetadata(
      metadata[signupMetadataKeys.memberKvkkAcceptedAt],
    ),
    memberTermsAcceptedAt: optionalDateFromMetadata(
      metadata[signupMetadataKeys.memberTermsAcceptedAt],
    ),
    memberMarketingConsentAt: optionalDateFromMetadata(
      metadata[signupMetadataKeys.memberMarketingConsentAt],
    ),
    memberConsentIpAddress: normalizeIpAddress(
      metadata[signupMetadataKeys.memberConsentIpAddress],
    ),
  };
}

function consentUpdateForExistingUser(
  existingUser: {
    memberKvkkAcceptedAt: Date | null;
    memberTermsAcceptedAt: Date | null;
    memberMarketingConsentAt: Date | null;
    memberConsentIpAddress: string | null;
  } | null,
  signupMetadata: MemberSignupMetadataInput,
): Prisma.UserUpdateInput {
  if (!existingUser) {
    return {};
  }

  return {
    memberKvkkAcceptedAt: existingUser.memberKvkkAcceptedAt
      ? undefined
      : signupMetadata.memberKvkkAcceptedAt,
    memberTermsAcceptedAt: existingUser.memberTermsAcceptedAt
      ? undefined
      : signupMetadata.memberTermsAcceptedAt,
    memberMarketingConsentAt: existingUser.memberMarketingConsentAt
      ? undefined
      : signupMetadata.memberMarketingConsentAt,
    memberConsentIpAddress: existingUser.memberConsentIpAddress
      ? undefined
      : signupMetadata.memberConsentIpAddress,
  };
}

function normalizeMetadataText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length >= 2 ? normalized.slice(0, 120) : null;
}

function normalizeMetadataPhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeTurkishPhone(value);

  return normalizedTurkishMobileRegex.test(normalized) ? normalized : null;
}

function optionalDateFromMetadata(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeIpAddress(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized.slice(0, 45) : null;
}

function serializeAuthError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      errorName: error.name,
      prismaErrorCode: error.code,
      errorMessage: sanitizeLogText(error.message),
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
      prismaErrorCode: null,
      errorMessage: sanitizeLogText(error.message),
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  return {
    errorName: "UnknownError",
    prismaErrorCode: null,
    errorMessage: sanitizeLogText(String(error)),
    stackFirstThreeLines: [],
  };
}

function sanitizeStack(stack?: string) {
  return stack?.split("\n").slice(0, 3).map(sanitizeLogText) ?? [];
}

function sanitizeLogText(value: string) {
  return value
    .replace(/(access_token=)([^&\s]+)/gi, "$1***")
    .replace(/(refresh_token=)([^&\s]+)/gi, "$1***")
    .replace(/(token_hash=)([^&\s]+)/gi, "$1***")
    .replace(/(password=)([^&\s]+)/gi, "$1***")
    .replace(/(cookie:?\s*)(.+)/gi, "$1***");
}
